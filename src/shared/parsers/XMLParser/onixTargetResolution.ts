import type { PublicationEntity, PublicationType } from '@/src/entities/publication/model/publication.types';
import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import type { WorkEntity, WorkId, WorkType } from '@/src/entities/work/model/work.types';

import { WorkTypes } from '../../constants/work';
import type { FormFieldOption } from '../../interfaces';
import type {
  ExistingWorkMatchesByIdentifier,
  ImportIdentifier,
  ImportIssue,
  ImportIssueSource,
  ImportPlan,
  SeriesImportPlan,
} from '../../types';
import {
  ONIX_DESCRIPTIVE_ACKNOWLEDGED,
  ONIX_MANIFESTATION_OMIT,
  type OnixAdaptedGroup,
  type OnixContributorIntentGroup,
  type OnixDescriptiveCompatibility,
  type OnixDescriptiveFamily,
  type OnixDescriptiveFinding,
  type OnixEditionResolution,
  type OnixExistingWork,
  type OnixExistingWorkDescriptiveFacts,
  type OnixImportPlanSidecar,
  type OnixManifestationChoice,
  type OnixPlanBlocker,
  type OnixPlanInputs,
  type OnixPlannedProduct,
  type OnixPlannedRecord,
  type OnixPlannedWorkGroup,
  type OnixProductActionEvidence,
  type OnixProductNode,
  type OnixProductTargetAction,
  type OnixSourcePlan,
  type OnixSourceRecord,
  type OnixStatedCountField,
  type OnixStatedWorkCounts,
  type OnixTargetEvidence,
  type OnixWorkGroup,
  type OnixWorkTargetAction,
  type OnixWorkTargetEvidence,
  type OnixWorkTypeResolution,
} from '../../types/onixPlanning';
import { importIdentifierKey, normaliseDoi, normaliseIsbn } from '../../utils/importPreflight/identifiers';
import { getDisplayTitle } from '../../utils/work';
import {
  buildOnixDescriptiveWork,
  compareOnixDescriptiveFamily,
  groupFindingsOf,
  type OnixBuiltDescriptiveWork,
  type OnixDescriptivePlan,
  type OnixSeriesPlanEntry,
  planOnixDescriptiveSeries,
  resolveOnixDescriptiveWork,
} from './onixDescriptive';

/**
 * Exact existing-target reconciliation and publisher decisions for an ONIX plan (thoth-app#182).
 *
 * `resolveOnixTargets` asks Thoth only what exact identity can answer: a Work DOI or WorkIdentifier ISBN,
 * an alternative-format ISBN, and each Product's own ISBN - never a Product DOI, LCCN or OCLC number,
 * never a title or a name - and reads back only the Works those exact answers name.
 *
 * `resolveOnixImportPlan` is pure. From the source plan, that evidence and the publisher's decisions it
 * derives the action of every Work group and Product, every blocker that still stands, and - only when
 * nothing stands - the plan the current executor can faithfully run. Actions the executor cannot perform,
 * such as a Publication added to an existing Work, stay in the sidecar exactly as they are and keep the
 * plan from being offered: they are never turned into a new Work to fit.
 */

const { BookChapter, BookSet, EditedBook, JournalIssue, Monograph, Textbook } = WorkTypes.enum;

/** The top-level WorkTypes an ordinary new Work may be given for the whole file. BookChapter never is. */
export const ONIX_FILE_WORK_TYPES: readonly WorkType[] = [Monograph, EditedBook, Textbook, JournalIssue, BookSet];

/** A single Work may also be chosen as a BookChapter, which then still needs its parent. */
export const ONIX_WORK_OVERRIDE_TYPES: readonly WorkType[] = [...ONIX_FILE_WORK_TYPES, BookChapter];

export const EMPTY_ONIX_PLAN_INPUTS: OnixPlanInputs = {
  fileWorkType: null,
  workTypeOverrides: {},
  manifestationChoices: {},
  editionInputs: {},
  excludedRecordKeys: [],
  thothCompatibilityConfirmed: false,
  descriptiveChoices: {},
};

/** Thoth stores an edition in a PostgreSQL `integer`. */
const MAX_TARGET_EDITION = 2_147_483_647;

/** The records a publisher may leave out of an import: notifications Thoth has no faithful way to apply. */
export const ONIX_EXCLUDABLE_DISPOSITIONS: ReadonlySet<OnixSourceRecord['disposition']> = new Set([
  'PARTIAL_UPDATE',
  'DELETE',
  'OWNERSHIP_TRANSFER',
]);

/* ------------------------------------------------------------------------------------------------ */
/* Target lookups                                                                                   */
/* ------------------------------------------------------------------------------------------------ */

export type OnixTargetLookup = {
  /** The existing Works carrying each exact identifier, scoped to the active publisher and post-filtered exactly. */
  readonly findWorks: (identifiers: readonly ImportIdentifier[]) => Promise<ExistingWorkMatchesByIdentifier>;
  /** One existing Work, read by an id an exact lookup has already returned. */
  readonly getWork: (workId: WorkId) => Promise<WorkEntity>;
};

const doiIdentifier = (doi: string): ImportIdentifier | null => {
  const value = normaliseDoi(doi);

  return value === null ? null : { basis: 'doi', value };
};

const isbnIdentifier = (isbn: string): ImportIdentifier | null => {
  const value = normaliseIsbn(isbn);

  return value === null ? null : { basis: 'isbn', value };
};

const isbnProxies = (group: OnixWorkGroup): string[] =>
  group.aliases.filter(({ type, value }) => type === '15' && /^\d{13}$/.test(value)).map(({ value }) => value);

/** Every exact identifier the plan can be reconciled by, once each, in a stable order. */
const lookupIdentifiersOf = (sourcePlan: OnixSourcePlan): ImportIdentifier[] => {
  const identifiers = new Map<string, ImportIdentifier>();
  const add = (identifier: ImportIdentifier | null) => {
    if (identifier !== null) identifiers.set(importIdentifierKey(identifier), identifier);
  };

  sourcePlan.groups.forEach((group) => {
    if (group.workDoi.kind === 'DOI') add(doiIdentifier(group.workDoi.doi));

    isbnProxies(group).forEach((isbn) => add(isbnIdentifier(isbn)));
    group.externalIsbns.forEach((isbn) => add(isbnIdentifier(isbn)));
  });

  sourcePlan.products.forEach(({ isbn }) => {
    if (isbn.kind === 'ACCEPTED') add(isbnIdentifier(isbn.isbn));
  });

  return [...identifiers.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, identifier]) => identifier);
};

/** What the existing Work holds of the descriptive families, as read back: only ever compared, never written. */
const existingDescriptiveFacts = (work: WorkEntity): OnixExistingWorkDescriptiveFacts => ({
  titles: work.titles.map(({ canonical, title, subtitle, fullTitle, localeCode }) => ({
    canonical,
    title,
    subtitle: subtitle ?? '',
    fullTitle,
    localeCode,
  })),
  languages: work.languages.map(({ code, relation }) => ({ code, relation })),
  subjects: work.subjects.map(({ type, code, ordinal }) => ({ type, code, ordinal })),
  contributions: work.contributions.map(({ type, orderNumber, fullName, orcidId }) => ({
    type,
    orderNumber,
    fullName,
    orcid: orcidId ?? '',
  })),
  issues: (work.issues ?? []).map(({ seriesId, seriesName, ordinal }) => ({ seriesId, seriesName, ordinal })),
  status: work.status,
  publicationDate: work.publicationDate ?? null,
  withdrawnDate: work.withdrawnDate ?? null,
  place: work.place ?? '',
  landingPage: work.landingPage ?? '',
  copyrightHolder: work.copyrightHolder ?? '',
  pageCount: work.pageCount ?? 0,
  imageCount: work.imageCount ?? 0,
  tableCount: work.tableCount ?? 0,
  audioCount: work.audioCount ?? 0,
  videoCount: work.videoCount ?? 0,
  bibliographyNote: work.bibliographyNote ?? '',
  fundings: work.fundings.map(
    ({ institutionId, institutionRor, program, projectName, projectShortname, grantNumber }) => ({
      institutionId,
      institutionRor: institutionRor ?? '',
      program: program ?? '',
      projectName: projectName ?? '',
      projectShortname: projectShortname ?? '',
      grantNumber: grantNumber ?? '',
    }),
  ),
});

const toExistingWork = (workId: WorkId, work: WorkEntity): OnixExistingWork => ({
  workId,
  type: work.type,
  imprintId: work.imprintId,
  edition: work.edition ?? null,
  doi: work.doi ?? '',
  title: getDisplayTitle(work.titles).title,
  publications: work.publications.map(({ id, type, isbn }) => ({ publicationId: id, type, isbn: isbn ? isbn : null })),
  descriptive: existingDescriptiveFacts(work),
});

export const resolveOnixTargets = async (
  sourcePlan: OnixSourcePlan,
  lookup: OnixTargetLookup,
  publisherId: string,
): Promise<OnixTargetEvidence> => {
  const identifiers = lookupIdentifiersOf(sourcePlan);

  if (identifiers.length === 0) return { publisherId, identifiers: [], works: [] };

  const matches = await lookup.findWorks(identifiers);
  const resolutions = identifiers.map((identifier) => ({
    ...identifier,
    workIds: [...new Set((matches.get(importIdentifierKey(identifier)) ?? []).map(({ workId }) => workId))].sort(),
  }));
  const workIds = [...new Set(resolutions.flatMap(({ workIds: ids }) => ids))].sort();
  const works = await Promise.all(workIds.map(async (workId) => toExistingWork(workId, await lookup.getWork(workId))));

  return { publisherId, identifiers: resolutions, works };
};

/* ------------------------------------------------------------------------------------------------ */
/* Resolution                                                                                       */
/* ------------------------------------------------------------------------------------------------ */

export type OnixPlanResolutionContext = {
  readonly sourcePlan: OnixSourcePlan;
  readonly targets: OnixTargetEvidence;
  readonly inputs: OnixPlanInputs;
  /** The publisher's imprints: the tenant boundary an existing Work must sit inside. */
  readonly imprints: readonly FormFieldOption[];
  /** The canonical descriptive reductions of the same source (thoth-app#183). */
  readonly descriptive: OnixDescriptivePlan;
  /** The publisher's Series, which a planned or compared Series membership is matched against. */
  readonly serieses: readonly SeriesEntity[];
  /** The parsed candidate plan, whose Works exist only for groups `adaptableGroupKeys` names. */
  readonly candidatePlan?: ImportPlan;
  readonly adaptation?: readonly OnixAdaptedGroup[];
};

export type OnixResolvedImportPlan = {
  readonly sidecar: OnixImportPlanSidecar;
  /** Every planning disclosure: the source plan's, the decisions', and those of the Publications planned. */
  readonly warnings: readonly ImportIssue[];
  /** The plan the current executor can faithfully run, or null while anything blocks. */
  readonly plan: ImportPlan | null;
};

type ManifestationState =
  | { readonly kind: 'TYPE'; readonly type: PublicationType; readonly chosen: boolean }
  | { readonly kind: 'OMITTED'; readonly reason: 'UNREPRESENTABLE' | 'ACKNOWLEDGED' | 'PUBLISHER_CHOICE' }
  | { readonly kind: 'PENDING' };

const manifestationStateOf = (
  node: OnixProductNode,
  choice: OnixManifestationChoice | undefined,
): ManifestationState => {
  const { manifestation } = node;

  if (choice === ONIX_MANIFESTATION_OMIT) {
    return {
      kind: 'OMITTED',
      reason:
        manifestation.kind === 'UNREPRESENTABLE' && manifestation.acknowledgementRequired
          ? 'ACKNOWLEDGED'
          : 'PUBLISHER_CHOICE',
    };
  }

  switch (manifestation.kind) {
    case 'RESOLVED':
      return { kind: 'TYPE', type: manifestation.type, chosen: false };
    case 'INPUT_REQUIRED':
      return choice !== undefined && manifestation.candidates.includes(choice)
        ? { kind: 'TYPE', type: choice, chosen: true }
        : { kind: 'PENDING' };
    case 'UNREPRESENTABLE':
      return manifestation.acknowledgementRequired
        ? { kind: 'PENDING' }
        : { kind: 'OMITTED', reason: 'UNREPRESENTABLE' };
  }
};

const validEdition = (value: number | undefined): value is number =>
  value !== undefined && Number.isInteger(value) && value >= 1 && value <= MAX_TARGET_EDITION;

const recordSource = (record: Pick<OnixSourceRecord, 'index' | 'recordReference'> | undefined): ImportIssueSource =>
  record === undefined
    ? { kind: 'file' }
    : {
        kind: 'onix',
        productIndex: record.index,
        ...(record.recordReference === null ? {} : { recordReference: record.recordReference }),
      };

const describe = (record: Pick<OnixSourceRecord, 'index' | 'recordReference'> | undefined) =>
  record === undefined
    ? 'a Product'
    : record.recordReference === null
      ? `product ${record.index}`
      : `product ${record.index} (${record.recordReference})`;

const blocker = (
  code: OnixPlanBlocker['code'],
  classification: OnixPlanBlocker['classification'],
  scope: { recordKey?: string; productKey?: string; groupKey?: string },
  paths: readonly string[],
  detail: OnixPlanBlocker['detail'] = {},
): OnixPlanBlocker => ({
  code,
  classification,
  recordKey: scope.recordKey ?? null,
  productKey: scope.productKey ?? null,
  groupKey: scope.groupKey ?? null,
  paths,
  detail,
});

/** The task that owns the descriptive families this resolver compares with an existing Work. */
const DESCRIPTIVE_OWNER = 'APP-IMPORT-ONIX-DESC-01';

/**
 * The blocker an unanswered descriptive finding stands as. The finding itself - its family, source locations,
 * explanation and the answer that can resolve it - stays in the sidecar under `detail.findingKey`.
 */
const descriptiveBlocker = (finding: OnixDescriptiveFinding, recordKey: string | undefined): OnixPlanBlocker => {
  const scope = { recordKey, productKey: finding.productKey ?? undefined, groupKey: finding.groupKey };
  const paths = finding.locations.map(({ path }) => path);
  const detail = { findingKey: finding.key, family: finding.family, finding: finding.code };

  if (finding.resolution.kind === 'CHOICE') {
    return blocker('DESCRIPTIVE_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', scope, paths, detail);
  }

  if (finding.resolution.kind === 'INPUT') {
    return blocker('DESCRIPTIVE_INPUT_REQUIRED', 'TARGET_INPUT_REQUIRED', scope, paths, detail);
  }

  if (finding.resolution.kind === 'ACKNOWLEDGE') {
    const classification =
      finding.classification === 'TARGET_UNREPRESENTABLE' || finding.classification === 'SOURCE_CONFLICT'
        ? finding.classification
        : 'TARGET_INPUT_REQUIRED';

    return blocker('DESCRIPTIVE_ACKNOWLEDGEMENT_REQUIRED', classification, scope, paths, detail);
  }

  switch (finding.classification) {
    case 'SOURCE_CONFLICT':
      return blocker('DESCRIPTIVE_SOURCE_CONFLICT', 'SOURCE_CONFLICT', scope, paths, detail);
    case 'TARGET_INPUT_REQUIRED':
      return blocker('DESCRIPTIVE_INPUT_REQUIRED', 'TARGET_INPUT_REQUIRED', scope, paths, detail);
    case 'TARGET_UNREPRESENTABLE':
      return blocker('DESCRIPTIVE_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', scope, paths, detail);
    case 'EXECUTION_DEFERRED':
      return blocker('DESCRIPTIVE_EXECUTION_DEFERRED', 'EXECUTION_DEFERRED', scope, paths, detail);
    default:
      // A blocking finding of any other class is a shape the reductions did not expect: never passed through.
      return blocker('DESCRIPTIVE_PREFLIGHT_GAP', 'PREFLIGHT_GAP', scope, paths, detail);
  }
};

type DescriptiveGroupState = Pick<OnixBuiltDescriptiveWork, 'findings' | 'pendingFindingKeys'> & {
  readonly values: OnixBuiltDescriptiveWork['values'];
  /** Present only once the adapter's lookups made the Work buildable. */
  readonly built: OnixBuiltDescriptiveWork | null;
};

/** A Work group's descriptive state: built from its lookups when adapted, otherwise from the reductions alone. */
const descriptiveStateOf = (
  plan: OnixDescriptivePlan,
  groupKey: string,
  options: { readonly choices: Readonly<Record<string, string>>; readonly thothProfileActive: boolean },
  adapted: OnixAdaptedGroup | undefined,
): DescriptiveGroupState => {
  if (adapted !== undefined) {
    const built = buildOnixDescriptiveWork(plan, groupKey, { ...options, lookups: adapted.descriptive });

    return { built, values: built.values, findings: built.findings, pendingFindingKeys: built.pendingFindingKeys };
  }

  const resolved = resolveOnixDescriptiveWork(plan, groupKey, options);
  const inapplicable = new Set(resolved.inapplicableFindingKeys);

  return {
    built: null,
    values: resolved.values,
    findings: [
      ...groupFindingsOf(plan, groupKey).filter((finding) => !inapplicable.has(finding.key)),
      ...resolved.findings,
    ],
    pendingFindingKeys: resolved.pendingFindingKeys,
  };
};

type GroupTarget = {
  readonly target: OnixWorkTargetAction | null;
  readonly existingWork: OnixExistingWork | null;
  readonly evidence: readonly OnixWorkTargetEvidence[];
  readonly verification: OnixPlannedWorkGroup['thothVerification'];
  readonly blockers: readonly OnixPlanBlocker[];
};

/** The existing Work candidates exact identity evidence gives one group, independent of any publisher decision. */
const resolveGroupTarget = (
  group: OnixWorkGroup,
  products: readonly OnixProductNode[],
  targets: OnixTargetEvidence,
  imprintIds: ReadonlySet<string>,
  recordPath: (productKey: string) => string,
): GroupTarget => {
  const workById = new Map(targets.works.map((work) => [work.workId, work]));
  const workIdsOf = (identifier: ImportIdentifier | null): readonly WorkId[] =>
    identifier === null
      ? []
      : (targets.identifiers.find(({ basis, value }) => basis === identifier.basis && value === identifier.value)
          ?.workIds ?? []);

  const blockers: OnixPlanBlocker[] = [];
  const evidence: OnixWorkTargetEvidence[] = [];
  const candidates = new Set<WorkId>();
  let ambiguous = false;

  const consider = (
    identifier: ImportIdentifier | null,
    value: string,
    evidenceOf: (workId: WorkId) => OnixWorkTargetEvidence,
  ) => {
    const workIds = workIdsOf(identifier);

    if (workIds.length > 1) {
      ambiguous = true;
      blockers.push(
        blocker('EXISTING_TARGET_AMBIGUOUS', 'SOURCE_CONFLICT', { groupKey: group.groupKey }, [], {
          basis: identifier?.basis ?? '',
          value,
          workIds,
        }),
      );
    } else if (workIds.length === 1) {
      candidates.add(workIds[0]);
      evidence.push(evidenceOf(workIds[0]));
    }
  };

  if (group.workDoi.kind === 'DOI') {
    const { doi } = group.workDoi;

    consider(doiIdentifier(doi), doi, (workId) => ({ kind: 'WORK_DOI', doi, workId }));
  }

  isbnProxies(group).forEach((isbn) =>
    consider(isbnIdentifier(isbn), isbn, (workId) => ({ kind: 'WORK_ISBN_PROXY', isbn, workId })),
  );
  group.externalIsbns.forEach((isbn) =>
    consider(isbnIdentifier(isbn), isbn, (workId) => ({ kind: 'ALTERNATIVE_FORMAT_ISBN', isbn, workId })),
  );

  /* The Thoth compatibility profile: native ids are verified only against exact live evidence. */
  let verification: GroupTarget['verification'] = 'NOT_APPLICABLE';

  if (group.compatibility === 'THOTH_PROFILE' && group.thothWorkId !== null) {
    const nativeWorkId = group.thothWorkId;
    const native = products.filter(({ thoth }) => thoth.kind === 'NATIVE');
    const nativeWork = workById.get(nativeWorkId) ?? null;
    const outcomes = native.map((node) => {
      const publicationId = node.thoth.kind === 'NATIVE' ? node.thoth.publicationId : '';

      if (node.isbn.kind === 'ACCEPTED') {
        const workIds = workIdsOf(isbnIdentifier(node.isbn.isbn));

        if (workIds.length !== 1) return 'UNKNOWN';
        if (workIds[0] !== nativeWorkId) return 'CONTRADICTED';

        const acceptedIsbn = normaliseIsbn(node.isbn.isbn);
        const existing = workById
          .get(workIds[0])
          ?.publications.find(({ isbn }) => isbn !== null && normaliseIsbn(isbn) === acceptedIsbn);

        if (!existing) return 'UNKNOWN';

        return existing.publicationId === publicationId ? 'VERIFIED' : 'CONTRADICTED';
      }

      return 'PENDING_SIBLING';
    });
    const provenByIsbn = outcomes.includes('VERIFIED');
    const resolvedOutcomes = outcomes.map((outcome, index) => {
      if (outcome !== 'PENDING_SIBLING') return outcome;

      const { thoth } = native[index];
      const publicationId = thoth.kind === 'NATIVE' ? thoth.publicationId : '';

      if (!provenByIsbn || nativeWork === null) return 'UNKNOWN';

      return nativeWork.publications.some((publication) => publication.publicationId === publicationId)
        ? 'VERIFIED'
        : 'UNKNOWN';
    });
    const unauthorised = provenByIsbn && nativeWork !== null && !imprintIds.has(nativeWork.imprintId);

    verification =
      unauthorised || resolvedOutcomes.includes('CONTRADICTED')
        ? 'CONTRADICTED'
        : resolvedOutcomes.every((outcome) => outcome === 'VERIFIED')
          ? 'VERIFIED'
          : 'UNVERIFIED';

    if (verification === 'CONTRADICTED') {
      blockers.push(
        blocker(
          'THOTH_PROFILE_CONTRADICTED',
          'SOURCE_CONFLICT',
          { groupKey: group.groupKey },
          native.map(({ productKey }) => recordPath(productKey)),
          { workId: nativeWorkId, reason: unauthorised ? 'UNAUTHORISED_IMPRINT' : 'NATIVE_ID_MISMATCH' },
        ),
      );
    } else if (provenByIsbn) {
      candidates.add(nativeWorkId);
      evidence.push({ kind: 'THOTH_NATIVE_IDS', workId: nativeWorkId });
    }
  }

  if (ambiguous) return { target: null, existingWork: null, evidence, verification, blockers };

  if (candidates.size > 1) {
    blockers.push(
      blocker('CONFLICTING_EXISTING_WORKS', 'SOURCE_CONFLICT', { groupKey: group.groupKey }, [], {
        workIds: [...candidates].sort(),
      }),
    );

    return { target: null, existingWork: null, evidence, verification, blockers };
  }

  if (candidates.size === 1) {
    const existingWork = workById.get([...candidates][0]) ?? null;

    if (existingWork === null) {
      // An exact answer named a Work that could not be read back: nothing about it can be relied on.
      blockers.push(
        blocker('EXISTING_TARGET_AMBIGUOUS', 'PREFLIGHT_GAP', { groupKey: group.groupKey }, [], {
          workIds: [...candidates],
        }),
      );

      return { target: null, existingWork: null, evidence, verification, blockers };
    }

    return { target: 'EXISTING_WORK', existingWork, evidence, verification, blockers };
  }

  return { target: 'NEW_WORK', existingWork: null, evidence: [{ kind: 'NO_TARGET_MATCH' }], verification, blockers };
};

const SOURCE_CONFLICT_CLASSES = new Set<OnixPlanBlocker['classification']>(['SOURCE_CONFLICT', 'SOURCE_INVALID']);

/**
 * The Work groups the target adapter should build candidates for: those exact evidence, within the publisher's
 * imprints, leaves to become new Works, and whose source and identity evidence are not themselves in conflict.
 * No publisher decision can change either fact, so the set is fixed before any decision is made.
 */
export const adaptableGroupKeys = (
  sourcePlan: OnixSourcePlan,
  targets: OnixTargetEvidence,
  imprints: readonly FormFieldOption[],
): string[] => {
  const imprintIds = new Set(imprints.map(({ value }) => value));

  return sourcePlan.groups
    .filter((group) => {
      const products = sourcePlan.products.filter(({ groupKey }) => groupKey === group.groupKey);
      const productKeys = new Set(products.map(({ productKey }) => productKey));
      const { target, blockers } = resolveGroupTarget(group, products, targets, imprintIds, () => '');
      const conflicted = [...sourcePlan.blockers, ...blockers].some(
        ({ classification, groupKey, productKey }) =>
          SOURCE_CONFLICT_CLASSES.has(classification) &&
          (groupKey === group.groupKey || (productKey !== null && productKeys.has(productKey))),
      );

      return !conflicted && target === 'NEW_WORK';
    })
    .map(({ groupKey }) => groupKey);
};

export const resolveOnixImportPlan = (context: OnixPlanResolutionContext): OnixResolvedImportPlan => {
  const { sourcePlan, targets, inputs, imprints, descriptive, serieses } = context;
  const choices = inputs.descriptiveChoices;
  const imprintIds = new Set(imprints.map(({ value }) => value));
  const imprintIdByName = new Map(imprints.map(({ label, value }) => [label, value]));
  const recordByKey = new Map(sourcePlan.records.map((record) => [record.recordKey, record]));
  const productByKey = new Map(sourcePlan.products.map((node) => [node.productKey, node]));
  const representative = (productKey: string) =>
    recordByKey.get(productByKey.get(productKey)?.representativeRecordKey ?? '');
  const recordPath = (productKey: string) => representative(productKey)?.path ?? '';
  const adaptedByGroup = new Map((context.adaptation ?? []).map((group) => [group.groupKey, group]));

  const excluded = new Set(
    inputs.excludedRecordKeys.filter((recordKey) => {
      const record = recordByKey.get(recordKey);

      return record !== undefined && ONIX_EXCLUDABLE_DISPOSITIONS.has(record.disposition);
    }),
  );

  const warnings: ImportIssue[] = [...sourcePlan.warnings];
  const choiceOf = (productKey: string): OnixManifestationChoice | undefined => inputs.manifestationChoices[productKey];
  const manifestationOf = new Map(
    sourcePlan.products.map((node) => [node.productKey, manifestationStateOf(node, choiceOf(node.productKey))]),
  );

  /* Work groups and their Products. */
  const groupTargets = new Map(
    sourcePlan.groups.map((group) => [
      group.groupKey,
      resolveGroupTarget(
        group,
        sourcePlan.products.filter(({ groupKey }) => groupKey === group.groupKey),
        targets,
        imprintIds,
        recordPath,
      ),
    ]),
  );

  const compatibilityActive = (verification: OnixPlannedWorkGroup['thothVerification']) =>
    verification === 'VERIFIED' || (verification === 'UNVERIFIED' && inputs.thothCompatibilityConfirmed);

  const targetBlockers: OnixPlanBlocker[] = [];
  const plannedProducts = new Map<string, OnixPlannedProduct>();
  const plannedGroups: OnixPlannedWorkGroup[] = [];
  const descriptiveFindings: OnixDescriptiveFinding[] = [];
  const descriptiveCompatibility: OnixDescriptiveCompatibility[] = [];
  const builtByGroup = new Map<string, OnixBuiltDescriptiveWork>();
  const seriesEntries: OnixSeriesPlanEntry[] = [];

  sourcePlan.groups.forEach((group) => {
    const {
      target,
      existingWork,
      evidence,
      verification,
      blockers: resolutionBlockers,
    } = groupTargets.get(group.groupKey) as GroupTarget;
    const members = sourcePlan.products
      .filter(({ groupKey }) => groupKey === group.groupKey)
      .sort((a, b) => (representative(a.productKey)?.index ?? 0) - (representative(b.productKey)?.index ?? 0));
    const groupBlockers: OnixPlanBlocker[] = [...resolutionBlockers];
    const productBlockers: OnixPlanBlocker[] = [];
    // The Thoth-origin conventions of the descriptive families apply only where the profile is verified or confirmed.
    const descriptiveOptions = {
      choices,
      thothProfileActive: group.compatibility === 'THOTH_PROFILE' && compatibilityActive(verification),
    };
    let comparedDescriptive = false;
    /**
     * The Products that would become a Publication of the existing Work, with the type they would take -
     * whether or not the attachment resolved. What this task already decides about an attachment (the type
     * the target holds, the Work facts the source contradicts) is decided for a would-be attachment too.
     */
    const wouldAttach = new Map<string, PublicationType>();

    if (verification === 'UNVERIFIED' && !inputs.thothCompatibilityConfirmed) {
      groupBlockers.push(
        blocker(
          'THOTH_COMPATIBILITY_CONFIRMATION_REQUIRED',
          'TARGET_INPUT_REQUIRED',
          { groupKey: group.groupKey },
          members.map(({ productKey }) => recordPath(productKey)),
          { workId: group.thothWorkId ?? '' },
        ),
      );
    }

    members.forEach((node) => {
      const { productKey } = node;
      const manifestation = manifestationOf.get(productKey) as ManifestationState;
      const record = representative(productKey);
      const productEvidence: OnixProductActionEvidence[] = [];
      let action: OnixProductTargetAction | null = null;
      let blocked = false;

      if (node.isbn.kind === 'ACCEPTED' && target !== null) {
        const { isbn } = node.isbn;
        const acceptedIsbn = normaliseIsbn(isbn);
        const workIds =
          targets.identifiers.find(({ basis, value }) => basis === 'isbn' && value === acceptedIsbn)?.workIds ?? [];

        if (workIds.length > 1) {
          blocked = true;
          productBlockers.push(
            blocker('EXISTING_TARGET_AMBIGUOUS', 'SOURCE_CONFLICT', { productKey }, [node.isbn.path], {
              basis: 'isbn',
              value: isbn,
              workIds,
            }),
          );
        } else if (workIds.length === 1) {
          if (target === 'EXISTING_WORK' && existingWork !== null && workIds[0] === existingWork.workId) {
            const existing = existingWork.publications.find(
              ({ isbn: existingIsbn }) => existingIsbn !== null && normaliseIsbn(existingIsbn) === acceptedIsbn,
            );

            action = 'ALREADY_PRESENT';
            productEvidence.push({
              kind: 'ISBN_MATCH',
              isbn,
              workId: existingWork.workId,
              publicationId: existing?.publicationId ?? null,
            });

            if (node.manifestation.kind === 'RESOLVED' && existing && existing.type !== node.manifestation.type) {
              productBlockers.push(
                blocker(
                  'EXISTING_PUBLICATION_TYPE_CONTRADICTION',
                  'SOURCE_CONFLICT',
                  { productKey },
                  [record?.path ?? ''],
                  {
                    sourceType: node.manifestation.type,
                    existingType: existing.type,
                    publicationId: existing.publicationId,
                  },
                ),
              );
            }
          } else {
            blocked = true;
            productBlockers.push(
              blocker('WRONG_WORK_ISBN', 'SOURCE_CONFLICT', { productKey }, [node.isbn.path], {
                isbn,
                existingWorkId: workIds[0],
                resolvedTarget: target === 'EXISTING_WORK' && existingWork !== null ? existingWork.workId : 'NEW_WORK',
              }),
            );
          }
        }
      }

      if (action === null && !blocked && target === 'EXISTING_WORK' && existingWork !== null) {
        const nativePublication =
          compatibilityActive(verification) && node.thoth.kind === 'NATIVE'
            ? existingWork.publications.find(
                ({ publicationId }) => node.thoth.kind === 'NATIVE' && publicationId === node.thoth.publicationId,
              )
            : undefined;

        if (nativePublication && node.thoth.kind === 'NATIVE') {
          action = 'ALREADY_PRESENT';
          productEvidence.push({
            kind: 'THOTH_PUBLICATION_ID',
            publicationId: node.thoth.publicationId,
            workId: existingWork.workId,
          });
        } else if (manifestation.kind === 'OMITTED') {
          action = 'OMIT/EXCLUDED';
          productEvidence.push({ kind: 'MANIFESTATION_OMITTED', reason: manifestation.reason });
        } else if (manifestation.kind === 'TYPE') {
          const collision = existingWork.publications.find(({ type }) => type === manifestation.type);

          wouldAttach.set(productKey, manifestation.type);

          if (collision) {
            productBlockers.push(
              blocker('EXISTING_TYPE_COLLISION', 'TARGET_UNREPRESENTABLE', { productKey }, [record?.path ?? ''], {
                publicationType: manifestation.type,
                existingPublicationId: collision.publicationId,
              }),
            );
          }

          /*
           * Identity is proven; compatibility is not. Attaching a Publication to an existing Work asserts that
           * everything the record says about the Work holds of that Work. The descriptive families are compared
           * with the exact existing Work by their canonical reductions (thoth-app#183): a compatible family
           * stands no longer, a contradicted one blocks as a contradiction, and one that cannot be compared stays
           * unverified with the reasons why. The families #184 and #185 own stay undecided, with the family, its
           * owner and its exact source path, rather than being settled from a legacy projection (specification
           * amendments `5665475597` and `5667182357`).
           */
          const scope = { recordKey: record?.recordKey, productKey, groupKey: group.groupKey };
          let standing = 0;

          node.compatibilityAssertions.forEach(({ family, owner, ownerIssue, locations }) => {
            const paths = locations.map(({ path }) => path);
            const detail = {
              workId: existingWork.workId,
              publicationType: manifestation.type,
              family,
              owner,
              ownerIssue,
            };

            if (owner !== DESCRIPTIVE_OWNER) {
              standing += 1;
              productBlockers.push(
                blocker('EXISTING_WORK_COMPATIBILITY_UNVERIFIED', 'PREFLIGHT_GAP', scope, paths, detail),
              );

              return;
            }

            const comparison = compareOnixDescriptiveFamily(
              descriptive,
              group.groupKey,
              family as OnixDescriptiveFamily,
              existingWork.descriptive,
              { ...descriptiveOptions, serieses, imprintId: existingWork.imprintId },
            );

            comparedDescriptive = true;
            descriptiveCompatibility.push({
              productKey,
              groupKey: group.groupKey,
              workId: existingWork.workId,
              family: family as OnixDescriptiveFamily,
              outcome: comparison.outcome,
              reasons: comparison.reasons,
            });

            if (comparison.outcome === 'COMPATIBLE') return;

            standing += 1;
            productBlockers.push(
              comparison.outcome === 'CONTRADICTED'
                ? blocker('EXISTING_WORK_DESCRIPTIVE_CONTRADICTION', 'SOURCE_CONFLICT', scope, paths, {
                    ...detail,
                    reasons: comparison.reasons,
                  })
                : blocker('EXISTING_WORK_COMPATIBILITY_UNVERIFIED', 'PREFLIGHT_GAP', scope, paths, {
                    ...detail,
                    reasons: comparison.reasons,
                    findingKeys: comparison.findingKeys,
                  }),
            );
          });

          if (standing === 0) {
            action = 'CREATE_PUBLICATION_ON_EXISTING_WORK';
            productEvidence.push({ kind: 'EXISTING_WORK_WITHOUT_THIS_PUBLICATION', workId: existingWork.workId });

            if (!collision) {
              productBlockers.push(
                blocker(
                  'ATTACH_TO_EXISTING_WORK_DEFERRED',
                  'EXECUTION_DEFERRED',
                  { productKey },
                  [record?.path ?? ''],
                  {
                    workId: existingWork.workId,
                    publicationType: manifestation.type,
                  },
                ),
              );
            }
          }
        }
      }

      if (action === null && !blocked && target === 'NEW_WORK') {
        if (manifestation.kind === 'OMITTED') {
          action = 'OMIT/EXCLUDED';
          productEvidence.push({ kind: 'MANIFESTATION_OMITTED', reason: manifestation.reason });
        } else if (manifestation.kind === 'TYPE') {
          action = 'CREATE_PUBLICATION';
          productEvidence.push({ kind: 'NO_TARGET_MATCH' });
        }
      }

      if (action === 'ALREADY_PRESENT' && existingWork !== null) {
        warnings.push({
          severity: 'warning',
          code: 'onix.target.already_present',
          message: `${describe(record)} is already in Thoth as a Publication of "${existingWork.title}", so it is not created again`,
          source: recordSource(record),
        });
      }

      if (
        action === 'OMIT/EXCLUDED' &&
        manifestation.kind === 'OMITTED' &&
        manifestation.reason !== 'UNREPRESENTABLE'
      ) {
        warnings.push({
          severity: 'warning',
          code: 'onix.manifestation.omitted',
          message:
            manifestation.reason === 'ACKNOWLEDGED'
              ? `${describe(record)} is a package Thoth cannot hold as one Publication; its omission was acknowledged, so no Publication is created for it`
              : `The manifestation of ${describe(record)} is omitted from this import at the publisher's choice, so no Publication is created for it`,
          source: recordSource(record),
        });
      }

      plannedProducts.set(productKey, {
        productKey,
        recordKeys: node.recordKeys,
        groupKey: group.groupKey,
        isbn: node.isbn.kind === 'ACCEPTED' ? node.isbn.isbn : null,
        manifestation: node.manifestation,
        publicationType:
          manifestation.kind === 'TYPE' &&
          (action === 'CREATE_PUBLICATION' || action === 'CREATE_PUBLICATION_ON_EXISTING_WORK')
            ? manifestation.type
            : null,
        action,
        evidence: productEvidence,
        executable: false,
      });
    });

    /* A Work holds one Publication per type: distinct Products cannot silently share one. */
    const byType = new Map<PublicationType, string[]>();

    members.forEach(({ productKey }) => {
      const planned = plannedProducts.get(productKey) as OnixPlannedProduct;
      const publicationType = planned.publicationType ?? wouldAttach.get(productKey) ?? null;

      if (publicationType !== null) byType.set(publicationType, [...(byType.get(publicationType) ?? []), productKey]);
    });

    byType.forEach((productKeys, publicationType) => {
      if (productKeys.length < 2) return;

      groupBlockers.push(
        blocker(
          'SAME_TYPE_COLLISION',
          'TARGET_UNREPRESENTABLE',
          { groupKey: group.groupKey },
          productKeys.map((productKey) => recordPath(productKey)),
          { publicationType, productKeys: [...productKeys].sort() },
        ),
      );
    });

    /* An existing Work is never updated: differences block an attachment and are disclosed otherwise. */
    if (target === 'EXISTING_WORK' && existingWork !== null) {
      if (!imprintIds.has(existingWork.imprintId)) {
        groupBlockers.push(
          blocker('EXISTING_WORK_UNAUTHORIZED', 'SOURCE_CONFLICT', { groupKey: group.groupKey }, [], {
            workId: existingWork.workId,
          }),
        );
      }

      const fields: string[] = [];

      if (
        group.edition.kind === 'EXPLICIT' &&
        existingWork.edition !== null &&
        group.edition.edition !== existingWork.edition
      ) {
        fields.push('edition');
      }

      if (
        group.workDoi.kind === 'DOI' &&
        existingWork.doi.length > 0 &&
        normaliseDoi(group.workDoi.doi) !== normaliseDoi(existingWork.doi)
      ) {
        fields.push('doi');
      }

      const sourceImprintIds = new Set(
        members.flatMap(({ imprintName }) => {
          const imprintId = imprintName === null ? undefined : imprintIdByName.get(imprintName);

          return imprintId === undefined ? [] : [imprintId];
        }),
      );

      if ([...sourceImprintIds].some((imprintId) => imprintId !== existingWork.imprintId)) fields.push('imprint');

      if (fields.length > 0) {
        // A would-be attachment blocks on a contradiction exactly as a resolved one does: leaving compatibility
        // to a later task never turns this task's own contradiction into a disclosure.
        const attaches = members.some(({ productKey }) => wouldAttach.has(productKey));

        if (attaches) {
          groupBlockers.push(
            blocker('EXISTING_WORK_CONTRADICTION', 'SOURCE_CONFLICT', { groupKey: group.groupKey }, [], { fields }),
          );
        } else {
          warnings.push({
            severity: 'warning',
            code: 'onix.target.existing_work_difference',
            message: `Thoth's existing Work "${existingWork.title}" differs from ${describe(representative(members[0].productKey))} in ${fields.join(', ')}; this import changes nothing about the existing Work`,
            source: recordSource(representative(members[0].productKey)),
          });
        }
      }
    }

    /* WorkType: the existing target's, or an explicit publisher choice. Never a default. */
    const override = inputs.workTypeOverrides[group.groupKey];
    const validOverride = override !== undefined && ONIX_WORK_OVERRIDE_TYPES.includes(override) ? override : undefined;
    const fileWorkType =
      inputs.fileWorkType !== null && ONIX_FILE_WORK_TYPES.includes(inputs.fileWorkType) ? inputs.fileWorkType : null;
    let workType: OnixWorkTypeResolution = { status: 'UNRESOLVED' };

    if (target === 'EXISTING_WORK' && existingWork !== null) {
      workType = { status: 'RESOLVED', type: existingWork.type, provenance: 'EXISTING_TARGET' };

      if (validOverride !== undefined && validOverride !== existingWork.type) {
        groupBlockers.push(
          blocker('WORK_TYPE_OVERRIDE_CONFLICT', 'SOURCE_CONFLICT', { groupKey: group.groupKey }, [], {
            override: validOverride,
            existing: existingWork.type,
          }),
        );
      }
    } else if (target === 'NEW_WORK') {
      if (validOverride !== undefined) {
        workType = { status: 'RESOLVED', type: validOverride, provenance: 'USER_WORK_OVERRIDE' };

        if (validOverride === BookChapter) {
          groupBlockers.push(
            blocker('WORK_TYPE_PARENT_RELATION_REQUIRED', 'TARGET_INPUT_REQUIRED', { groupKey: group.groupKey }, []),
          );
        }
      } else if (fileWorkType !== null) {
        workType = { status: 'RESOLVED', type: fileWorkType, provenance: 'USER_FILE_DEFAULT' };
      } else {
        groupBlockers.push(
          blocker('WORK_TYPE_INPUT_REQUIRED', 'TARGET_INPUT_REQUIRED', { groupKey: group.groupKey }, []),
        );
      }
    }

    /* Edition: written only for a new Work, and only once it is an integer the source or the publisher gave. */
    let edition: OnixEditionResolution = { status: 'UNRESOLVED' };

    if (target === 'EXISTING_WORK' && existingWork?.edition != null) {
      edition = { status: 'RESOLVED', edition: existingWork.edition, basis: 'EXISTING_TARGET' };
    } else if (target === 'NEW_WORK') {
      if (group.edition.kind === 'EXPLICIT')
        edition = { status: 'RESOLVED', edition: group.edition.edition, basis: 'EXPLICIT' };
      else if (group.edition.kind === 'DEFAULT_FIRST_EDITION')
        edition = { status: 'RESOLVED', edition: 1, basis: 'DEFAULT_FIRST_EDITION' };
      else if (group.edition.kind === 'INPUT_REQUIRED' && validEdition(inputs.editionInputs[group.groupKey])) {
        edition = { status: 'RESOLVED', edition: inputs.editionInputs[group.groupKey], basis: 'USER_INPUT' };
      }
    }

    const adapted = adaptedByGroup.get(group.groupKey);

    /* The descriptive Work a new Work group becomes, and whatever about it is still unanswered (thoth-app#183). */
    if (target === 'NEW_WORK') {
      const state = descriptiveStateOf(descriptive, group.groupKey, descriptiveOptions, adapted);
      const byKey = new Map(state.findings.map((finding) => [finding.key, finding]));
      const findingSource = (finding: OnixDescriptiveFinding) =>
        representative(finding.productKey ?? members[0]?.productKey ?? '');

      if (state.built !== null) builtByGroup.set(group.groupKey, state.built);

      descriptiveFindings.push(...state.findings);
      state.pendingFindingKeys.forEach((key) => {
        const finding = byKey.get(key);

        groupBlockers.push(
          finding === undefined
            ? blocker('DESCRIPTIVE_PREFLIGHT_GAP', 'PREFLIGHT_GAP', { groupKey: group.groupKey }, [], {
                findingKey: key,
              })
            : descriptiveBlocker(finding, findingSource(finding)?.recordKey),
        );
      });
      state.findings.forEach((finding) => {
        const acknowledged =
          finding.blocking &&
          finding.resolution.kind === 'ACKNOWLEDGE' &&
          choices[finding.key] === ONIX_DESCRIPTIVE_ACKNOWLEDGED;

        if (finding.blocking && !acknowledged) return;

        warnings.push({
          severity: 'warning',
          code: acknowledged ? 'onix.descriptive.acknowledged' : 'onix.descriptive.disclosure',
          message: acknowledged ? `Acknowledged by the publisher: ${finding.message}` : finding.message,
          source: recordSource(findingSource(finding)),
        });
      });

      const imprintId = members
        .map(({ imprintName }) => (imprintName === null ? undefined : imprintIdByName.get(imprintName)))
        .find((id) => id !== undefined);

      seriesEntries.push({
        groupKey: group.groupKey,
        workId: adapted?.workId ?? group.groupKey,
        imprintId: imprintId ?? '',
        thothProfileActive: descriptiveOptions.thothProfileActive,
        memberships: state.values.series,
      });
    } else if (comparedDescriptive) {
      // What an unverified family is waiting for is answered here, so the findings travel with the comparison.
      descriptiveFindings.push(
        ...descriptiveStateOf(descriptive, group.groupKey, descriptiveOptions, undefined).findings,
      );
    }

    if (adapted !== undefined && adapted.conflictingFields.length > 0) {
      groupBlockers.push(
        blocker(
          'GROUPED_WORK_FACT_CONFLICT',
          'SOURCE_CONFLICT',
          { groupKey: group.groupKey },
          members.map(({ productKey }) => recordPath(productKey)),
          { fields: adapted.conflictingFields },
        ),
      );
    }

    targetBlockers.push(...productBlockers, ...groupBlockers);

    plannedGroups.push({
      groupKey: group.groupKey,
      productKeys: group.productKeys,
      compatibility: group.compatibility,
      thothVerification: verification,
      target,
      existingWorkId: existingWork?.workId ?? null,
      evidence,
      plannedWorkId: target === 'NEW_WORK' && adapted !== undefined ? adapted.workId : null,
      workType,
      edition,
      workDoi: group.workDoi,
      executable: false,
    });
  });

  /* Series memberships are one question per Series for the whole import, and one issue per ordinal. */
  const seriesPlanning = planOnixDescriptiveSeries(seriesEntries, { serieses, choices });
  const seriesFindings = new Map(seriesPlanning.findings.map((finding) => [finding.key, finding]));

  descriptiveFindings.push(...seriesPlanning.findings);
  seriesPlanning.pendingFindingKeys.forEach((key) => {
    const finding = seriesFindings.get(key) as OnixDescriptiveFinding;
    const firstProduct = sourcePlan.groups.find(({ groupKey }) => groupKey === finding.groupKey)?.productKeys[0];

    targetBlockers.push(descriptiveBlocker(finding, representative(firstProduct ?? '')?.recordKey));
  });

  /* Source blockers, less those the publisher's decisions have answered. */
  const sourceBlockers = sourcePlan.blockers.filter((sourceBlocker) => {
    switch (sourceBlocker.code) {
      case 'RECORD_NOT_COMPLETE':
        return sourceBlocker.recordKey === null || !excluded.has(sourceBlocker.recordKey);
      case 'RECORD_SEQUENCE_AMBIGUITY':
        return !(sourceBlocker.detail.recordKeys as readonly string[]).every((recordKey) => excluded.has(recordKey));
      case 'MANIFESTATION_INPUT_REQUIRED':
      case 'MANIFESTATION_ACKNOWLEDGEMENT_REQUIRED':
        return manifestationOf.get(sourceBlocker.productKey ?? '')?.kind === 'PENDING';
      case 'EDITION_INPUT_REQUIRED': {
        const groupKey = sourceBlocker.groupKey ?? '';

        return groupTargets.get(groupKey)?.target !== 'EXISTING_WORK' && !validEdition(inputs.editionInputs[groupKey]);
      }
      default:
        return true;
    }
  });

  const blockers = [...sourceBlockers, ...targetBlockers];
  const executable = blockers.length === 0;

  /* Records: planned as Products, omitted (test records, explicit exclusions), or holding the file. */
  const records: OnixPlannedRecord[] = sourcePlan.records.map((record) => {
    const omitted = record.disposition === 'TEST' || excluded.has(record.recordKey);

    if (excluded.has(record.recordKey)) {
      warnings.push({
        severity: 'warning',
        code: 'onix.record.omitted',
        message: `${describe(record)} (NotificationType ${record.notificationType}) is excluded from this import at the publisher's choice: nothing is created, updated or deleted because of it`,
        source: recordSource(record),
      });
    }

    return {
      recordKey: record.recordKey,
      index: record.index,
      recordReference: record.recordReference,
      notificationType: record.notificationType,
      disposition: record.disposition,
      deletionText: record.deletionText,
      productKey: record.productKey,
      action: record.productKey !== null ? 'PLANNED' : omitted ? 'OMIT/EXCLUDED' : 'BLOCKED',
    };
  });

  const blockedKeys = new Set(
    blockers.flatMap(({ productKey, groupKey }) => [productKey, groupKey]).filter((key) => key !== null),
  );
  const products = sourcePlan.products.map((node) => {
    const planned = plannedProducts.get(node.productKey) as OnixPlannedProduct;

    return {
      ...planned,
      executable:
        planned.action !== null &&
        planned.action !== 'CREATE_PUBLICATION_ON_EXISTING_WORK' &&
        !blockedKeys.has(node.productKey) &&
        !blockedKeys.has(planned.groupKey),
    };
  });
  const workGroups = plannedGroups.map((group) => ({
    ...group,
    executable:
      group.target !== null &&
      !blockedKeys.has(group.groupKey) &&
      group.productKeys.every(
        (productKey) => products.find((candidate) => candidate.productKey === productKey)?.executable,
      ) &&
      (group.target === 'EXISTING_WORK' ||
        (group.workType.status === 'RESOLVED' && group.edition.status === 'RESOLVED')),
  }));

  const activations = workGroups
    .filter(({ compatibility }) => compatibility === 'THOTH_PROFILE')
    .map(({ thothVerification }) => thothVerification);
  const sidecar: OnixImportPlanSidecar = {
    kind: 'onix',
    version: 1,
    header: sourcePlan.header,
    compatibility: {
      ...sourcePlan.compatibility,
      activation:
        activations.length === 0
          ? 'NOT_APPLICABLE'
          : activations.includes('CONTRADICTED')
            ? 'CONTRADICTED'
            : activations.includes('UNVERIFIED')
              ? inputs.thothCompatibilityConfirmed
                ? 'CONFIRMED'
                : 'AWAITING_CONFIRMATION'
              : 'VERIFIED',
    },
    records,
    products,
    workGroups,
    inputs,
    blockers,
    executable,
    descriptive: {
      findings: descriptiveFindings,
      compatibility: descriptiveCompatibility,
      contributorIntents: contributorIntentGroups(builtByGroup, adaptedByGroup),
      statedCounts: statedWorkCounts(builtByGroup, adaptedByGroup),
    },
  };

  return {
    sidecar,
    warnings: [...warnings, ...plannedPublicationIssues(sidecar, context)],
    plan: executable ? buildPlan(sidecar, context, builtByGroup, seriesPlanning.series) : null,
  };
};

/** Every contributor intent of every built Work and chapter, by the planned Work its contributions are on. */
const contributorIntentGroups = (
  builtByGroup: ReadonlyMap<string, OnixBuiltDescriptiveWork>,
  adaptedByGroup: ReadonlyMap<string, OnixAdaptedGroup>,
): OnixContributorIntentGroup[] =>
  [...builtByGroup].flatMap(([groupKey, built]) =>
    built.contributorIntents.flatMap(({ chapterPath, key, ordinals }) => {
      const workId =
        chapterPath === null
          ? adaptedByGroup.get(groupKey)?.workId
          : built.chapters.find(({ path }) => path === chapterPath)?.workId;

      return workId === undefined ? [] : [{ workId, key, ordinals }];
    }),
  );

const STATED_COUNT_FIELDS: readonly OnixStatedCountField[] = ['imageCount', 'tableCount', 'audioCount', 'videoCount'];

/** The counts each built Work's source states, zero included, for every Work that states any. */
const statedWorkCounts = (
  builtByGroup: ReadonlyMap<string, OnixBuiltDescriptiveWork>,
  adaptedByGroup: ReadonlyMap<string, OnixAdaptedGroup>,
): OnixStatedWorkCounts[] =>
  [...builtByGroup].flatMap(([groupKey, { values }]) => {
    const workId = adaptedByGroup.get(groupKey)?.workId;
    const counts: Partial<Record<OnixStatedCountField, number>> = {};

    STATED_COUNT_FIELDS.forEach((field) => {
      const value = values[field];

      if (value !== null) counts[field] = value;
    });

    return workId === undefined || Object.keys(counts).length === 0 ? [] : [{ workId, counts }];
  });

/** What building each planned Publication raised, for the Publications actually planned. */
const plannedPublicationIssues = (
  sidecar: OnixImportPlanSidecar,
  context: OnixPlanResolutionContext,
): ImportIssue[] => {
  const adaptedByGroup = new Map((context.adaptation ?? []).map((group) => [group.groupKey, group]));

  return sidecar.products.flatMap(({ productKey, groupKey, action, publicationType }) =>
    action === 'CREATE_PUBLICATION' && publicationType !== null
      ? [...(adaptedByGroup.get(groupKey)?.publications[productKey]?.[publicationType]?.issues ?? [])]
      : [],
  );
};

/**
 * The executable plan: every new Work group, as its candidate Work with the resolved WorkType, edition and
 * Work identifiers, the descriptive Work its canonical reductions, lookups and the publisher's answers built,
 * and the Publications planned for it, and nothing else. An existing Work is never written, so its group
 * carries no Work and its chapters and series memberships go with it; a new Work whose every manifestation
 * was omitted is still created, with no Publication.
 */
const buildPlan = (
  sidecar: OnixImportPlanSidecar,
  context: OnixPlanResolutionContext,
  builtByGroup: ReadonlyMap<string, OnixBuiltDescriptiveWork>,
  series: SeriesImportPlan,
): ImportPlan | null => {
  const { candidatePlan, adaptation, sourcePlan } = context;

  if (candidatePlan === undefined || adaptation === undefined) return null;

  const sourceGroups = new Map(sourcePlan.groups.map((group) => [group.groupKey, group]));
  const adaptedByGroup = new Map(adaptation.map((group) => [group.groupKey, group]));
  const productOrder = new Map(sidecar.products.map((product, index) => [product.productKey, index]));
  const builtByWorkId = new Map<WorkId, OnixBuiltDescriptiveWork>();

  const works: WorkEntity[] = sidecar.workGroups
    .filter(({ target }) => target === 'NEW_WORK')
    .map((group) => {
      const adapted = adaptedByGroup.get(group.groupKey);
      const candidate = adapted === undefined ? undefined : candidatePlan.works.find(({ id }) => id === adapted.workId);
      const built = builtByGroup.get(group.groupKey);

      if (
        adapted === undefined ||
        candidate === undefined ||
        built === undefined ||
        group.workType.status !== 'RESOLVED' ||
        group.edition.status !== 'RESOLVED'
      ) {
        throw new Error(`ONIX plan group ${group.groupKey} is executable but has no adapted candidate Work`);
      }

      const { values } = built;

      if (values.status === null) {
        throw new Error(`ONIX plan group ${group.groupKey} is executable but has no resolved Work status`);
      }

      const source = sourceGroups.get(group.groupKey) as OnixWorkGroup;
      const profileFields = source.compatibility === 'THOTH_PROFILE' ? source.thothWorkFields : null;
      const publications: PublicationEntity[] = sidecar.products
        .filter(({ groupKey, action }) => groupKey === group.groupKey && action === 'CREATE_PUBLICATION')
        .sort((a, b) => (productOrder.get(a.productKey) ?? 0) - (productOrder.get(b.productKey) ?? 0))
        .map(({ productKey, publicationType }) => {
          const planned = adapted.publications[productKey]?.[publicationType as PublicationType];

          if (planned === undefined) {
            throw new Error(`ONIX plan Product ${productKey} has no adapted ${publicationType} Publication`);
          }

          return planned.publication;
        });

      builtByWorkId.set(candidate.id, built);

      return {
        ...candidate,
        type: group.workType.type,
        edition: group.edition.edition,
        doi: group.workDoi.kind === 'DOI' ? group.workDoi.doi : '',
        lccn: profileFields?.lccn ?? '',
        oclc: profileFields?.oclc ?? '',
        reference: profileFields?.reference ?? '',
        titles: values.titles,
        languages: values.languages,
        subjects: values.subjects,
        status: values.status,
        publicationDate: values.publicationDate,
        withdrawnDate: values.withdrawnDate,
        copyrightHolder: values.copyrightHolder,
        landingPage: values.landingPage,
        place: values.place,
        pageCount: values.pageCount,
        // A Work entity holds an unset count as 0; an explicit zero travels as the plan's stated counts.
        imageCount: values.imageCount ?? 0,
        tableCount: values.tableCount ?? 0,
        audioCount: values.audioCount ?? 0,
        videoCount: values.videoCount ?? 0,
        bibliographyNote: values.bibliographyNote,
        fundings: built.fundings,
        contributions: built.contributions,
        publications,
      };
    });

  const workById = new Map(works.map((work) => [work.id, work]));

  return {
    works,
    // A chapter is its own ContentItem's descriptive reduction, and inherits its Work's lifecycle and edition,
    // which the publisher may only have given here.
    chapters: candidatePlan.chapters.flatMap((chapter) => {
      const work = chapter.relationId === null ? undefined : workById.get(chapter.relationId);
      const built =
        work === undefined
          ? undefined
          : builtByWorkId.get(work.id)?.chapters.find(({ workId }) => workId === chapter.id);

      if (work === undefined) return [];

      if (built === undefined) throw new Error(`ONIX plan chapter ${chapter.id} has no descriptive chapter`);

      return [
        {
          ...chapter,
          edition: work.edition,
          status: work.status,
          publicationDate: work.publicationDate,
          withdrawnDate: work.withdrawnDate,
          copyrightHolder: work.copyrightHolder,
          titles: built.titles,
          languages: built.languages,
          subjects: built.subjects,
          contributions: built.contributions,
        },
      ];
    }),
    series: series
      .map((group) => ({ ...group, members: group.members.filter(({ workId }) => workById.has(workId)) }))
      .filter(({ members }) => members.length > 0),
    onix: sidecar,
  };
};
