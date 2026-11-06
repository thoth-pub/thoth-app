'use client';

import { Activity, useEffect, useMemo, useRef, useState } from 'react';

import { usePublisherStateMachine } from '@/src/entities/publisher';
import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import { currencyOptions, languageOptions, licenseOptions } from '@/src/shared/constants';
import { ContactTypes } from '@/src/shared/constants/accessibility';
import { useServices } from '@/src/shared/context';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { FormFieldOption } from '@/src/shared/interfaces';
import { type TranslateFunction, XMLParser } from '@/src/shared/parsers';
import { reduceOnixAccessibility } from '@/src/shared/parsers/XMLParser/onixAccessibility';
import { reduceOnixCollateral } from '@/src/shared/parsers/XMLParser/onixCollateral';
import { reduceOnixCommercial } from '@/src/shared/parsers/XMLParser/onixCommercial';
import { reduceOnixComponents } from '@/src/shared/parsers/XMLParser/onixComponents';
import { reduceOnixDescriptive } from '@/src/shared/parsers/XMLParser/onixDescriptive';
import { planOnixSource } from '@/src/shared/parsers/XMLParser/onixPlanning';
import {
  type OnixRelatedMaterialLookup,
  reduceOnixRelatedMaterial,
  resolveOnixRelatedMaterialTargets,
} from '@/src/shared/parsers/XMLParser/onixRelations';
import { reduceOnixReviewsPrizes } from '@/src/shared/parsers/XMLParser/onixReviewsPrizes';
import { reduceOnixRights } from '@/src/shared/parsers/XMLParser/onixRights';
import { reduceOnixSalesRights } from '@/src/shared/parsers/XMLParser/onixSalesRights';
import {
  attributeCountingFindings,
  bridgeAttributedOnixSource,
  type BridgedOnixSource,
  type CompletedOnixSource,
  createPublisherFixContext,
  type OnixHeldBackGroup,
  partitionOnixSourcePlan,
  projectOnixRefusal,
  projectOnixSourceIssues,
  projectOnixUnavailable,
  type PublisherFix,
  type PublisherFixContext,
  type PublisherFixOutcome,
  type PublisherFixState,
  revalidatePublisherFix,
  startPublisherFixSession,
} from '@/src/shared/parsers/XMLParser/onixSourceBridge';
import {
  adaptableGroupKeys,
  EMPTY_ONIX_PLAN_INPUTS,
  type OnixPlanResolutionContext,
  type OnixTargetLookup,
  resolveOnixImportPlan,
  resolveOnixTargets,
} from '@/src/shared/parsers/XMLParser/onixTargetResolution';
import type { OnixWorkerResult } from '@/src/shared/parsers/XMLParser/validation';
import { isPublisherFixable } from '@/src/shared/parsers/XMLParser/validation/recovery';
import {
  loadVerifiedResource,
  ONIX_VALIDATION_RESOURCE_PATH,
} from '@/src/shared/parsers/XMLParser/validation/resources';
import { createOnixValidationClient, type WorkerPort } from '@/src/shared/parsers/XMLParser/validation/worker/client';
import { ONIX_PROCESSING_FAILURE_MESSAGE } from '@/src/shared/parsers/XMLParser/XMLParser';
import type {
  ContributorsForSelection,
  ImportIssue,
  ImportPlan,
  ImportSource,
  OnixPlanInputs,
  OnixRelatedMaterialTargetEvidence,
  OnixTargetEvidence,
} from '@/src/shared/types';

import {
  createOnixValidationWorker,
  type OnixValidationSettlement,
  useOnixValidation,
} from '../hooks/useOnixValidation';
import { ContributorsSelection } from './ContributorsSelection';
import { ImportPhaseStatus } from './ImportPhaseStatus';
import { OnixPlanResolution } from './OnixPlanResolution';
import { type InlineFixMessage, type InlineFixResolvedBook, InlineFixReview } from './onixReview/InlineFixReview';
import { advisoryFindings, inlineFixBooks, type OnixReviewPresentationContext } from './onixReview/reviewModel';
import { OnixValidatedSource, OnixValidationStatus } from './OnixValidationStatus';

type XMLParseProps = {
  file: File;
  imprints: FormFieldOption[];
  serieses: SeriesEntity[];
  onValidationFailure?: (issues: ImportIssue[]) => void;
  /** The user cancelled validation: nothing was found, planned or imported, and the upload starts over. */
  onCancel?: () => void;
  onPreview?: (plan: ImportPlan, warnings: ImportIssue[], source: ImportSource) => void;
  /** How publisher fixes are checked (thoth-app#283); the production runtime unless a test supplies its own. */
  publisherFixRuntime?: PublisherFixRuntime;
};

/**
 * What the inline-fix review needs from the browser (thoth-app#283): the pinned ONIX XHTML subset, read through the
 * same integrity check the validator uses, and a fresh validation of bytes exactly as an upload is validated. Both stop
 * at once, with a rejection, when their signal aborts - the file changed, or the uploader went away.
 */
export type PublisherFixRuntime = {
  readonly loadContext: (signal?: AbortSignal) => Promise<PublisherFixContext>;
  readonly validate: (bytes: Uint8Array, signal?: AbortSignal) => Promise<OnixWorkerResult>;
};

const XHTML_SUBSET_RESOURCE = 'ONIX_XHTML_Subset.xsd';
/** The longest one re-validation may take before it is abandoned as unavailable. */
export const PUBLISHER_FIX_VALIDATION_TIMEOUT_MS = 10 * 60 * 1000;

export type PublisherFixRuntimeOptions = {
  readonly createWorker?: () => WorkerPort;
  readonly fetch?: typeof fetch;
  readonly origin?: () => string;
  readonly timeoutMs?: number;
};

/**
 * The production runtime. The XHTML subset is fetched from this origin's pinned `/onix-validation/` resources and
 * verified against its pin (`loadVerifiedResource`) before it is read; bytes that do not match are refused. Each
 * re-validation is a fresh #196 Worker session over the given bytes - never the uploaded file - continued past a size
 * warning the upload already accepted. Its Worker is terminated once it settles, throws, times out or is aborted, and
 * anything but a result is a failure the fix layer reports as `REVALIDATION_UNAVAILABLE`.
 */
export const createPublisherFixRuntime = ({
  createWorker = createOnixValidationWorker,
  fetch: fetchResource = (input, init) => fetch(input, init),
  origin = () => window.location.origin,
  timeoutMs = PUBLISHER_FIX_VALIDATION_TIMEOUT_MS,
}: PublisherFixRuntimeOptions = {}): PublisherFixRuntime => ({
  loadContext: async (signal) => {
    const bytes = await loadVerifiedResource(async (fileName) => {
      const url = new URL(`${ONIX_VALIDATION_RESOURCE_PATH}${fileName}`, origin());
      const response = await fetchResource(url, { credentials: 'same-origin', signal });
      if (!response.ok) throw new Error(`${fileName}: HTTP ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }, XHTML_SUBSET_RESOURCE);
    return createPublisherFixContext(new TextDecoder().decode(bytes));
  },
  validate: (bytes, signal) =>
    new Promise<OnixWorkerResult>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('ONIX re-validation aborted'));
        return;
      }
      const client = createOnixValidationClient({ createWorker });
      let settled = false;
      const finish = (settle: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        client.terminate();
        settle();
      };
      const onAbort = () => finish(() => reject(new Error('ONIX re-validation aborted')));
      const timer = setTimeout(
        () => finish(() => reject(new Error(`ONIX re-validation timed out after ${timeoutMs} ms`))),
        timeoutMs,
      );
      signal?.addEventListener('abort', onAbort, { once: true });
      (async () => {
        await client.ready;
        let outcome = await client.begin(bytes, { progress: false });
        if (outcome.kind === 'warning') outcome = await outcome.proceed();
        if (outcome.kind !== 'result') throw new Error(`ONIX re-validation ended: ${outcome.kind}`);
        return outcome.result;
      })().then(
        (result) => finish(() => resolve(result)),
        (error: unknown) => finish(() => reject(error)),
      );
    }),
});

export const PRODUCTION_PUBLISHER_FIX_RUNTIME: PublisherFixRuntime = createPublisherFixRuntime();

const NO_HELD_BACK_GROUPS: readonly OnixHeldBackGroup[] = [];

/**
 * Everything the ONIX resolver needs from one planned file except the publisher's decisions: the source plan, its
 * canonical descriptive, rights, commercial, sales-rights, accessibility, component, RelatedMaterial, collateral and review,
 * endorsement and prize reductions, its
 * exact existing targets and what Thoth holds for its relations and References, the publisher's Series, and the candidate
 * Works adapted for the groups those targets leave new.
 */
type OnixPlanning = Omit<OnixPlanResolutionContext, 'inputs' | 'imprints'>;

/** What the target side produced for one selected file, and nothing of any other. */
type TargetState = {
  /** The file every other field here belongs to. */
  readonly file: File;
  readonly isPlanning: boolean;
  /**
   * The canonical source the plan is built from, held whole beside the adapter value bridged from it. It may carry
   * counting findings, but only inside Work groups planning held back (thoth-app#282).
   */
  readonly validatedSource: BridgedOnixSource<CompletedOnixSource> | null;
  /**
   * The file planned but not yet decided. Its candidate plan is never itself offered for preview: only the
   * plan the resolver builds from it and `inputs` is.
   */
  readonly planning: OnixPlanning | null;
  /** The publisher's decisions for this file, which start with nothing decided. */
  readonly inputs: OnixPlanInputs;
  readonly multipleFoundedContributors: ContributorsForSelection;
  /** The publisher-fix session over this file's canonical result (thoth-app#283), once its XHTML subset is loaded. */
  readonly fixSession: PublisherFixState | null;
  /** Whether that session is not needed, loading, ready, or could not be loaded. */
  readonly fixLoading: 'IDLE' | 'LOADING' | 'READY' | 'FAILED';
  /** Every Work group a card was shown for, in the order first shown: cards keep it, resolved ones included. */
  readonly cardOrder: readonly string[];
  /** True while one fix is re-validated and, once applied, its corrected source re-planned: only one is ever in flight. */
  readonly fixBusy: boolean;
  /**
   * True from the moment a fix is applied until its corrected source has been planned. The plan held until then still
   * holds back the book just corrected, so it is never offered: if the re-plan fails, nothing is.
   */
  readonly planStale: boolean;
  /** The last refusal or rejection of each finding's fix. */
  readonly fixMessages: Readonly<Record<string, InlineFixMessage>>;
  /** Books skipped for now: they stay held back, with zero mutations. */
  readonly skipped: ReadonlySet<string>;
  /** Every book a publisher fix was applied to, with its fixes, by Work group. */
  readonly fixedBooks: Readonly<Record<string, InlineFixResolvedBook>>;
};

const nothingPlannedFor = (file: File): TargetState => ({
  file,
  isPlanning: false,
  validatedSource: null,
  planning: null,
  inputs: EMPTY_ONIX_PLAN_INPUTS,
  multipleFoundedContributors: {},
  fixSession: null,
  fixLoading: 'IDLE',
  cardOrder: [],
  fixBusy: false,
  planStale: false,
  fixMessages: {},
  skipped: new Set(),
  fixedBooks: {},
});

/** The adapter or planner failing on a source canonical validation accepted is Thoth's failure, not the file's. */
const PROCESSING_FAILURE: ImportIssue = {
  severity: 'error',
  code: 'onix.processing_failed',
  message: ONIX_PROCESSING_FAILURE_MESSAGE,
  source: { kind: 'file' },
};

export const XMLParse = (props: XMLParseProps) => {
  const {
    file,
    imprints,
    serieses,
    onValidationFailure,
    onCancel,
    onPreview,
    publisherFixRuntime = PRODUCTION_PUBLISHER_FIX_RUNTIME,
  } = props;

  const { contributorService, institutionService, importPreflightService, publisherService, workService } =
    useServices();
  const { activePublisher } = usePublisherStateMachine();
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const translate = t as TranslateFunction;

  // Everything the target side made of one file, in one value that names the file it belongs to, so
  // that changing the file lets go of all of it at once. Selecting another file resets it here, in the
  // same render, before anything the previous file produced can be shown or submitted under the new
  // one's name - whether or not the parent remounts this component for the new selection.
  const [target, setTarget] = useState<TargetState>(() => nothingPlannedFor(file));
  if (target.file !== file) setTarget(nothingPlannedFor(file));

  const {
    isPlanning,
    validatedSource,
    planning,
    inputs,
    multipleFoundedContributors,
    fixSession,
    fixLoading,
    cardOrder,
    fixBusy,
    planStale,
    fixMessages,
    skipped,
    fixedBooks,
  } = target;

  // Resolved again for every decision: pure, and the only source of a plan this component ever hands on. The WorkType
  // the contributor roles propose travels in the sidecar itself (`workGroups[].workTypeSuggestion`, thoth-app#261);
  // nothing is recomputed here.
  const resolution = planning === null ? null : resolveOnixImportPlan({ ...planning, inputs, imprints });
  const plan = resolution?.plan ?? null;
  // Read-only display context for the review (thoth-app#262): the canonical descriptive plan, for facts already decided
  // there such as the one resolved cover and the names of the contributors a decision is about; the candidate plan and
  // the exact existing targets, for display titles only. None of it decides a task, a block or an answer.
  const reviewContext = useMemo<OnixReviewPresentationContext | undefined>(
    () =>
      planning === null
        ? undefined
        : { descriptive: planning.descriptive, candidatePlan: planning.candidatePlan, targets: planning.targets },
    [planning],
  );

  /** Applies what one file's validation produced, and only while that file is still the selected one. */
  const applyToFile = (validated: File, change: Partial<TargetState>) =>
    setTarget((previous) => (previous.file === validated ? { ...previous, ...change } : previous));

  /**
   * Canonical source validation has settled. Only a result that permits continuation reaches the target
   * side - the adapter parse, the planner and its contributor and institution lookups - and then only
   * through the normalised Reference XML the Worker returned. Every other outcome stops here.
   */
  const planValidatedSource = async (settlement: OnixValidationSettlement, validated: File) => {
    // A settlement belongs to the file it was raised for; once that file is no longer the selection,
    // nothing it says is this selection's business to report either.
    if (validated !== target.file) return;

    switch (settlement.kind) {
      case 'cancelled':
        onCancel?.();
        return;
      case 'refused':
        onValidationFailure?.(projectOnixRefusal(settlement.envelope, translate));
        return;
      case 'error':
        // A file the browser cannot read is a problem with the upload itself, as it always was.
        onValidationFailure?.(
          settlement.code === 'FILE_UNREADABLE'
            ? [
                {
                  severity: 'error',
                  code: 'file.validation',
                  message: settlement.message,
                  source: { kind: 'file' },
                },
              ]
            : projectOnixUnavailable({ code: settlement.code, message: settlement.message }, translate),
        );
        return;
    }

    // A held-back book whose blocking finding the v1 allowlist can fix gets an inline fix (thoth-app#283): the session
    // starts once the pinned XHTML subset is loaded, and never blocks planning. Until then - or if it cannot be loaded -
    // such a finding says so, and its book can still be skipped.
    if (settlement.result.findings.some(isPublisherFixable)) {
      applyToFile(validated, { fixLoading: 'LOADING' });
      const signal = fixAbort.current?.signal;
      publisherFixRuntime
        .loadContext(signal)
        .then((context) =>
          applyToFile(validated, {
            fixSession: startPublisherFixSession(settlement.result, context),
            fixLoading: 'READY',
          }),
        )
        .catch((error: unknown) => {
          if (signal?.aborted) return;
          console.error('The ONIX XHTML subset for publisher fixes could not be loaded', error);
          applyToFile(validated, { fixLoading: 'FAILED' });
        });
    }

    await planResult(settlement.result, validated, (issues) => onValidationFailure?.(issues));
  };

  /**
   * Plans one canonical result: the uploaded file's, or - after an accepted publisher fix - the same ledger with that
   * fix recorded and its normalised source (thoth-app#283). The uploaded bytes are never read again.
   */
  const planResult = async (result: OnixWorkerResult, validated: File, report: (issues: ImportIssue[]) => void) => {
    const sourceIssues = projectOnixSourceIssues(result, translate);
    /** The whole file is held, as every blocked source was before thoth-app#282, with every issue it raised. */
    const holdFile = () => {
      // A blocked source always explains itself; a blocked result without a blocking finding is reported as such.
      const explained = sourceIssues.some(({ severity }) => severity === 'error');
      report(
        explained
          ? sourceIssues
          : [
              ...sourceIssues,
              ...projectOnixUnavailable({ code: result.status, message: result.stop?.text ?? '' }, translate),
            ],
      );
    };

    // Every counting finding must lie in one Product for anything to be planned: a stage 1-2 stop, a Header or
    // message-level finding, or any finding whose Product is uncertain holds the whole file (thoth-app#282).
    // A file every book of which is blocked is still reviewed when a publisher fix is possible (thoth-app#283): its books
    // are all held back, with their cards, and nothing is ready until a fix re-validates clean.
    const holdOptions = { allowNothingLeft: result.findings.some(isPublisherFixable) };
    const attribution = attributeCountingFindings(result, holdOptions);
    if (attribution.kind === 'FILE') {
      holdFile();
      return;
    }

    applyToFile(validated, { isPlanning: true });
    try {
      let bridged: BridgedOnixSource<CompletedOnixSource>;
      try {
        bridged = bridgeAttributedOnixSource(attribution);
      } catch (error) {
        console.error('Unexpected failure parsing the validated ONIX source', error);
        report([...sourceIssues, PROCESSING_FAILURE]);
        return;
      }

      // The file alone decides which records are Products, which Products manifest one Work, and what
      // each manifestation and edition can be. Nothing about Thoth is known yet. A Work group a counting source
      // finding lies in is then held back whole, and everything below plans the rest as if it were not in the file
      // (thoth-app#282); a source without one is planned whole, exactly as before.
      const partition = partitionOnixSourcePlan(
        planOnixSource(bridged.adapter, { provenance: bridged.provenance }),
        attribution,
        bridged.adapter,
        holdOptions,
      );
      if (partition.kind === 'FILE') {
        holdFile();
        return;
      }
      const { sourcePlan, heldBack } = partition;
      applyToFile(validated, { validatedSource: bridged });
      // Each held-back book keeps its card's place from now on, resolved or not (thoth-app#283).
      setTarget((previous) =>
        previous.file === validated
          ? {
              ...previous,
              cardOrder: [
                ...previous.cardOrder,
                ...heldBack.map(({ groupKey }) => groupKey).filter((key) => !previous.cardOrder.includes(key)),
              ],
            }
          : previous,
      );
      // So do the descriptive families: every title, contributor, language, subject, Series, lifecycle and
      // extent decision, read from the same canonical source with its Short provenance and the approved
      // recovery markers, and nothing else (thoth-app#183).
      const descriptive = reduceOnixDescriptive(bridged.adapter, sourcePlan, {
        provenance: bridged.provenance,
        recoveries: bridged.canonical.normalized.recoveries,
      });
      // And so do the Product rights - licences, technical protection, usage constraints - with each grouped Work's
      // licence, which only this reduction decides (thoth-app#211).
      const rights = reduceOnixRights(bridged.adapter, sourcePlan, { provenance: bridged.provenance });
      // And every ProductSupply - markets, suppliers, prices, unpriced reasons and supplier websites - with each
      // Publication's Prices and Location, which only this reduction decides (thoth-app#215).
      // The canonical normalised source is given too, for the one order the adapter value does not keep: which stock
      // quantity each Proximity qualifies (Specification Amendment 2A). The uploaded bytes are never read again.
      const commercial = reduceOnixCommercial(bridged.adapter, sourcePlan, {
        provenance: bridged.provenance,
        normalizedXml: bridged.canonical.normalized.xml,
      });
      // And every SalesRights, ROWSalesRightsType, SalesRestriction, equivalent product and ProductContact, each
      // compared with the Markets the commercial reduction read (thoth-app#217). Nothing is planned from them: Thoth
      // holds no territorial right and no product contact, so they are preserved and disclosed, and the approved losses
      // wait for the publisher's own acknowledgement.
      const publisherId = activePublisher?.id ?? '';
      const salesRightsOptions = { provenance: bridged.provenance, commercial };
      let salesRights = reduceOnixSalesRights(bridged.adapter, sourcePlan, salesRightsOptions);

      // An accessibility request contact is compared, by exact email, with the publisher's existing Accessibility
      // contacts: read back once, after source validation and only where the file states such a contact, and shown as
      // evidence only (5543566392 rules 58, 73). A read that fails leaves the comparison unmade; nothing of the contact
      // is logged.
      if (
        publisherId.length > 0 &&
        Object.values(salesRights.products).some(({ productContacts }) =>
          productContacts.some(({ role }) => role === '01'),
        )
      ) {
        try {
          const publisher = await publisherService.getPublisher(publisherId);

          salesRights = reduceOnixSalesRights(bridged.adapter, sourcePlan, {
            ...salesRightsOptions,
            publisherAccessibilityContactEmails: publisher.contacts
              .filter(({ type }) => type === ContactTypes.enum.Accessibility)
              .map(({ email }) => email),
          });
        } catch (error) {
          console.error(
            "The publisher's existing Accessibility contacts could not be read, so no accessibility request contact is compared with them",
            error,
          );
        }
      }

      // And every Product-level ProductFormFeature, with each Publication's accessibility, which only this reduction
      // decides (thoth-app#221): type 09 by its exact approved code combinations alone, the Product rights read beside
      // List 196 code 10, and no URL any feature carries ever fetched. Nothing from it touches the publisher.
      const accessibility = reduceOnixAccessibility(bridged.adapter, sourcePlan, {
        provenance: bridged.provenance,
        rights,
      });

      // And every ContentItem, which only this reduction decides (thoth-app#223): TextItemType 02, 03 and 04 as structural
      // chapters with their ordinals, pages and DOIs, 01 as a contained Work of its own, an AVItem as an acknowledged loss,
      // and every component fact a later stage owns kept for it. The adapter builds its candidate chapters from it too.
      const components = reduceOnixComponents(bridged.adapter, sourcePlan, { provenance: bridged.provenance });

      // And every RelatedWork and RelatedProduct, kept apart and read by construct and code, with every RelatedProduct/34
      // citation as the Reference facts its declared identifiers state (thoth-app#224). Nothing is looked up yet.
      const relatedMaterial = reduceOnixRelatedMaterial(bridged.adapter, sourcePlan, {
        provenance: bridged.provenance,
      });

      // And every TextContent, SupportingResource and promotional event, exactly as stated and where stated, with what each
      // abstract, table of contents, general note and AdditionalResource could be (thoth-app#225). Nothing is fetched,
      // downloaded or hosted, no resource type is read from a link, and a malformed TextContent canonical validation omitted
      // stays omitted, recorded by its marker alone.
      const collateral = reduceOnixCollateral(bridged.adapter, sourcePlan, {
        provenance: bridged.provenance,
        recoveries: bridged.canonical.normalized.recoveries,
        descriptive,
      });

      // And every review quote, cited review, endorsement and Prize (thoth-app#226): the review and endorsement TextContents
      // the collateral reduction already normalised, never read again, with every CitedContent, P.17 Prize and Contributor
      // Prize, each kept apart by what it is. Nothing is fetched, searched or matched by name, and no Prize has a scope until
      // the publisher gives it one.
      const reviewsPrizes = reduceOnixReviewsPrizes(bridged.adapter, sourcePlan, collateral, {
        provenance: bridged.provenance,
      });

      // Then Thoth is asked only what exact identity can answer, within the active publisher. A question
      // that cannot be asked or answered stops planning: it is never read as "nothing matched".
      const lookup: OnixTargetLookup = {
        findWorks: async (identifiers) => {
          if (publisherId.length === 0) throw new Error('No active publisher to resolve ONIX identifiers within');

          return importPreflightService.findExistingIdentifierMatches({ publisherId, identifiers: [...identifiers] });
        },
        getWork: (workId) => workService.getWork(workId),
      };

      // A relation may name a Work of any publisher: which one, and whether it lies inside this publisher, is read-only
      // discovery across Thoth, never a write, and never identity evidence for this file's own Works. The relations and
      // References of the existing Works the file resolves to are read whole, to be compared and never changed.
      const relatedMaterialLookup: OnixRelatedMaterialLookup = {
        findWorksGlobally: (identifiers) => importPreflightService.findWorksGlobally(identifiers),
        getWorkRelations: (workId) => importPreflightService.findWorkRelations(workId),
        getWorkReferences: (workId) => importPreflightService.findWorkReferences(workId),
      };

      let targets: OnixTargetEvidence;
      let relatedMaterialTargets: OnixRelatedMaterialTargetEvidence;
      try {
        targets = await resolveOnixTargets(sourcePlan, lookup, publisherId);
        relatedMaterialTargets = await resolveOnixRelatedMaterialTargets(
          relatedMaterial,
          sourcePlan,
          targets,
          relatedMaterialLookup,
        );
      } catch (error) {
        console.error('Existing ONIX targets could not be resolved', error);
        report([
          ...sourceIssues,
          {
            severity: 'error',
            code: 'onix.target.unavailable',
            message: translate('onixPlan.targetUnavailable'),
            source: { kind: 'file' },
          },
        ]);
        return;
      }

      // Only the Work groups that evidence leaves new become candidates: nothing of an existing Work is read
      // as a Work to create, or looked up for one.
      const xmlParser = new XMLParser(
        bridged.adapter,
        imprints,
        licenseOptions,
        serieses,
        contributorService,
        institutionService,
        languageOptions,
        currencyOptions,
        {
          sourcePlan,
          descriptive,
          components,
          collateral,
          adaptGroupKeys: adaptableGroupKeys(sourcePlan, targets, imprints),
        },
      );

      const parsed = await xmlParser.parse();

      if (parsed.status === 'failed') {
        report([...sourceIssues, ...parsed.issues]);
        return;
      }

      if (parsed.data.onix === undefined) {
        report([...sourceIssues, PROCESSING_FAILURE]);
        return;
      }

      applyToFile(validated, {
        // A plan of the current source: whatever fix was applied before it is now planned.
        planStale: false,
        planning: {
          sourcePlan,
          // #191 canonical findings/recoveries and adapter issues are bound into the final sidecar by #186.
          issues: [...sourceIssues, ...parsed.issues],
          descriptive,
          rights,
          commercial,
          salesRights,
          accessibility,
          components,
          relatedMaterial,
          relatedMaterialTargets,
          collateral,
          reviewsPrizes,
          serieses,
          targets,
          candidatePlan: parsed.data.plan,
          adaptation: parsed.data.onix.groups,
          // What a Publication attached to an exact existing Work is materialised from (thoth-app#187).
          attachmentPublications: parsed.data.onix.attachmentPublications,
          // Disclosed, never planned: nothing of a held-back Work group is executed (thoth-app#282).
          ...(heldBack.length === 0 ? {} : { heldBack }),
        },
        multipleFoundedContributors: parsed.data.contributorsForSelection,
      });
    } finally {
      applyToFile(validated, { isPlanning: false });
    }
  };

  const validation = useOnixValidation(file, planValidatedSource);
  const fixInFlight = useRef(false);
  /** Aborts the fix path of the current file - its subset load and any re-validation - when the file changes or on unmount. */
  const fixAbort = useRef<AbortController | null>(null);
  /** The file the uploader shows now, while it is mounted: what a fix that settles late must still belong to. */
  const currentFile = useRef<File | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fixAbort.current = controller;
    currentFile.current = file;
    return () => {
      controller.abort();
      currentFile.current = null;
    };
  }, [file]);

  // The held-back books with the inline fix each finding may take: worked out once per plan and session state.
  const fixBooks = useMemo(
    () => inlineFixBooks(planning?.heldBack ?? NO_HELD_BACK_GROUPS, fixSession),
    [planning, fixSession],
  );

  /**
   * One confirmed publisher fix: applied to a copy of the normalised source, the whole of which is validated again, and
   * accepted only if it re-validates clean (thoth-app#283). One fix at a time; a refused or rejected fix changes
   * nothing and says why beside its control. An accepted fix re-plans the file from the fixed result, so its book is
   * imported once nothing holds it back any more, and its card resolves in place. Nothing of a fix that settles after
   * its file was replaced, or the uploader closed, is applied, planned or reported.
   */
  const applyFix = async (fix: PublisherFix, key: string) => {
    // Serialised: one fix in flight per session, whatever the controls are doing between renders.
    if (fixSession === null || fixBusy || fixInFlight.current) return;
    fixInFlight.current = true;
    try {
      await settleFix(fixSession, fix, key);
    } finally {
      fixInFlight.current = false;
    }
  };

  const settleFix = async (session: PublisherFixState, fix: PublisherFix, key: string) => {
    const fixing = file;
    const signal = fixAbort.current?.signal;
    const isCurrent = () => currentFile.current === fixing && signal?.aborted !== true;
    const book = fixBooks.find(({ entries }) =>
      entries.some(({ finding }) => finding.id === fix.rule && finding.path === fix.path),
    );
    applyToFile(fixing, { fixBusy: true });
    let outcome: PublisherFixOutcome;
    try {
      outcome = await revalidatePublisherFix(session, fix, (bytes) => publisherFixRuntime.validate(bytes, signal));
    } catch (error) {
      console.error('A publisher fix could not be checked', error);
      outcome = { kind: 'REJECTED', reason: 'REVALIDATION_UNAVAILABLE', findings: [], state: session };
    }
    if (!isCurrent()) return;
    if (outcome.kind !== 'APPLIED') {
      applyToFile(fixing, { fixBusy: false, fixMessages: { ...fixMessages, [key]: { reason: outcome.reason } } });
      return;
    }
    const remaining = Object.fromEntries(Object.entries(fixMessages).filter(([settled]) => settled !== key));
    const fixedBook =
      book === undefined
        ? null
        : {
            groupKey: book.groupKey,
            title: book.title,
            isbns: book.isbns,
            fixes: [...(fixedBooks[book.groupKey]?.fixes ?? []), outcome.marker],
          };
    applyToFile(fixing, {
      fixSession: outcome.state,
      planStale: true,
      fixMessages: remaining,
      ...(fixedBook === null ? {} : { fixedBooks: { ...fixedBooks, [fixedBook.groupKey]: fixedBook } }),
    });
    try {
      await planResult(outcome.state.result, fixing, (issues) => {
        if (isCurrent()) onValidationFailure?.(issues);
      });
    } finally {
      applyToFile(fixing, { fixBusy: false });
    }
  };

  const handleSubmit = (resolvedPlan: ImportPlan) => {
    // Never while a fix is checked or re-planned, nor once an applied fix could not be: the plan is not the file's.
    if (fixBusy || planStale || fixInFlight.current) return;
    // The importer type and filename travel to the preview beside the plan, never in it: they
    // are what the running display and any failure report name the source by. What planning the
    // file's identity disclosed follows what the source and the adapter reported.
    onPreview?.(resolvedPlan, [...(resolvedPlan.onix?.issues ?? resolution?.warnings ?? [])], {
      type: 'onix',
      filename: file.name,
    });
  };

  return (
    <>
      <OnixValidationStatus view={validation.view} onProceed={validation.proceed} onCancel={validation.cancel} />
      {validatedSource && <OnixValidatedSource result={validatedSource.canonical} />}
      <Activity mode={isPlanning ? 'visible' : 'hidden'}>
        {/* Planning the validated source has no measurable numerator, so this labels the phase without
            inventing a percentage. */}
        <ImportPhaseStatus content="bulkImport.phase.parsingOnix" data-testid="import-phase-parsing" />
      </Activity>
      {/* Every held-back book once, on its own card: it is the book's disclosure that it will not be imported. */}
      {resolution && (
        <InlineFixReview
          books={fixBooks}
          fixed={fixedBooks}
          order={cardOrder}
          skipped={skipped}
          readyCount={planning?.sourcePlan.groups.length ?? 0}
          advisories={validatedSource ? advisoryFindings(validatedSource.canonical.findings) : []}
          availability={fixLoading === 'READY' ? 'READY' : fixLoading === 'FAILED' ? 'UNAVAILABLE' : 'LOADING'}
          busy={fixBusy}
          messages={fixMessages}
          onFix={(fix, key) => void applyFix(fix, key)}
          onSkip={(groupKey) => applyToFile(file, { skipped: new Set([...skipped, groupKey]) })}
        />
      )}
      {resolution && (
        <OnixPlanResolution
          sidecar={resolution.sidecar}
          context={reviewContext}
          onChange={(next) => applyToFile(file, { inputs: next })}
        />
      )}
      {/*
        Offered only once nothing blocks the plan, and only when it does something: an execution unit with an action
        to run - a Work to create, a Publication to attach to an existing Work, a relation to create (thoth-app#187).
        A plan that attaches to existing Works alone creates no new Work, and is offered all the same. Nothing is
        offered while a publisher fix is checked or its corrected source re-planned, nor after an applied fix whose
        re-plan did not complete: until then the plan still holds back the book just corrected (thoth-app#283).
      */}
      {plan && !fixBusy && !planStale && (plan.execution?.units ?? []).some(({ actions }) => actions.length > 0) && (
        <ContributorsSelection contributors={multipleFoundedContributors} plan={plan} onPreview={handleSubmit} />
      )}
    </>
  );
};
