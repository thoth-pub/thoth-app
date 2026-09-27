import type { LocationEntity } from '@/src/entities/locations/model/location.types';
import type { PriceEntity } from '@/src/entities/price/model/price.types';
import type { PublicationEntity, PublicationType } from '@/src/entities/publication/model/publication.types';
import type { ReferenceEntity } from '@/src/entities/reference/model/reference.types';
import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import type { WorkEntity, WorkId, WorkType } from '@/src/entities/work/model/work.types';

import { appConfig } from '../../config';
import { WorkTypes } from '../../constants/work';
import type { FormFieldOption } from '../../interfaces';
import type {
  AbstractEntity,
  ExistingWorkMatchesByIdentifier,
  ImportIdentifier,
  ImportIssue,
  ImportIssueSource,
  ImportPlan,
  ImportRelationEdge,
  SeriesImportPlan,
} from '../../types';
import {
  ONIX_DESCRIPTIVE_ACKNOWLEDGED,
  ONIX_MANIFESTATION_OMIT,
  ONIX_PRICE_OMIT,
  ONIX_RIGHTS_ACKNOWLEDGED,
  type OnixAccessibilityField,
  type OnixAccessibilityFinding,
  type OnixAccessibilityPlan,
  type OnixAdaptedGroup,
  type OnixChapterIntent,
  type OnixCollateralFinding,
  type OnixCollateralPlan,
  type OnixCollateralTargetAction,
  type OnixCommercialFinding,
  type OnixCommercialPlan,
  type OnixComponentFinding,
  type OnixComponentIntent,
  type OnixComponentPlan,
  type OnixContributorIntentGroup,
  type OnixDescriptiveCompatibility,
  type OnixDescriptiveFamily,
  type OnixDescriptiveFinding,
  type OnixEditionResolution,
  type OnixExistingPublication,
  type OnixExistingWork,
  type OnixExistingWorkDescriptiveFacts,
  type OnixImportPlanSidecar,
  type OnixManifestationChoice,
  type OnixManifestationDecision,
  type OnixPlanBlocker,
  type OnixPlanFinding,
  type OnixPlanInputs,
  type OnixPlannedProduct,
  type OnixPlannedRecord,
  type OnixPlannedWorkGroup,
  type OnixPriceCandidate,
  type OnixProductActionEvidence,
  type OnixProductNode,
  type OnixProductTargetAction,
  type OnixPublicationAccessibilityAction,
  type OnixPublicationAccessibilityState,
  type OnixReferenceCompatibility,
  type OnixRelatedMaterialFinding,
  type OnixRelatedMaterialPlan,
  type OnixRelatedMaterialTargetEvidence,
  type OnixRelationEndpoint,
  type OnixResolvedPrice,
  type OnixRightsFinding,
  type OnixRightsPlan,
  type OnixSalesRightsFinding,
  type OnixSalesRightsPlan,
  type OnixSourceLocation,
  type OnixSourcePlan,
  type OnixSourceRecord,
  type OnixStatedCountField,
  type OnixStatedWorkCounts,
  type OnixTargetEvidence,
  type OnixWorkGroup,
  type OnixWorkLicenceAction,
  type OnixWorkReferenceAction,
  type OnixWorkTargetAction,
  type OnixWorkTargetEvidence,
  type OnixWorkTypeResolution,
} from '../../types/onixPlanning';
import { importIdentifierKey, normaliseDoi, normaliseIsbn } from '../../utils/importPreflight/identifiers';
import { getDisplayTitle } from '../../utils/work';
import {
  isOfferedOnixAccessibilityAnswer,
  isRepresentableOnixAccessibility,
  ONIX_ACCESSIBILITY_FEATURE_TYPE,
  resolveOnixPublicationAccessibility,
} from './onixAccessibility';
import {
  isOfferedOnixCollateralAnswer,
  type OnixResolvedCollateral,
  resolveOnixCollateralComponent,
  resolveOnixCollateralWork,
} from './onixCollateral';
import { locationCarrierOf } from './onixCommercial';
import { isOfferedOnixComponentAnswer, resolveOnixComponents } from './onixComponents';
import {
  buildOnixDescriptiveWork,
  compareOnixDescriptiveFamily,
  groupFindingsOf,
  type OnixBuiltDescriptiveWork,
  type OnixDescriptivePlan,
  type OnixSeriesPlanEntry,
  planOnixDescriptiveSeries,
  resolveOnixDescriptiveComponent,
  resolveOnixDescriptiveWork,
} from './onixDescriptive';
import {
  compareOnixExistingReferences,
  isOfferedOnixRelatedMaterialAnswer,
  type OnixRelationGroupState,
  resolveOnixProductReferences,
  resolveOnixRelations,
  resolveOnixWorkReferences,
} from './onixRelations';
import { licenceIdentityOf, ONIX_SUPPORTED_LICENCES } from './onixRights';

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
  commercialChoices: {},
  rightsChoices: {},
  accessibilityChoices: {},
  componentChoices: {},
  relatedMaterialChoices: {},
  collateralChoices: {},
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

/**
 * An existing Publication as read back from its Work: its identity and type, and the four accessibility fields the Work
 * fragment already returns, read back only to compare with the source's accessibility (thoth-app#221), never to write.
 */
const toExistingPublication = (publication: WorkEntity['publications'][number]): OnixExistingPublication => ({
  publicationId: publication.id,
  type: publication.type,
  isbn: publication.isbn ? publication.isbn : null,
  accessibility: {
    accessibilityStandard: publication.accessibilityStandard ?? null,
    accessibilityAdditionalStandard: publication.accessibilityAdditionalStandard ?? null,
    accessibilityException: publication.accessibilityException ?? null,
    accessibilityReportUrl: publication.accessibilityReportUrl ? publication.accessibilityReportUrl : null,
  },
});

const toExistingWork = (workId: WorkId, work: WorkEntity): OnixExistingWork => ({
  workId,
  type: work.type,
  imprintId: work.imprintId,
  edition: work.edition ?? null,
  doi: work.doi ?? '',
  title: getDisplayTitle(work.titles).title,
  // Read back to compare with the source's licence (thoth-app#217; 5568901904 rules 119-124), never to write.
  license: work.license ?? '',
  publications: work.publications.map(toExistingPublication),
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
  /**
   * The canonical Product-rights reduction of the same source (thoth-app#211), the only authority for a new Work's
   * licence. Without it no licence is set, and a new Work whose source states rights cannot be planned.
   */
  readonly rights?: OnixRightsPlan;
  /**
   * The canonical ProductSupply reduction of the same source (thoth-app#215), the only authority for a planned
   * Publication's Prices and Location: nothing else about supply, price or supplier websites is ever read.
   */
  readonly commercial?: OnixCommercialPlan;
  /**
   * The canonical SalesRights and ProductContact reduction of the same source (thoth-app#217): the only authority on
   * what territorial rights and product contacts the file states. Given with the rights reduction, always; without it
   * beside one, no Work group can be planned.
   */
  readonly salesRights?: OnixSalesRightsPlan;
  /**
   * The canonical ProductFormFeature and accessibility reduction of the same source (thoth-app#221), the only authority
   * for a planned Publication's accessibility fields. Without it no accessibility is planned, and a Publication is
   * created with none, as before the reduction existed.
   */
  readonly accessibility?: OnixAccessibilityPlan;
  /**
   * The canonical component reduction of the same source (thoth-app#223), the only authority on what a ContentItem
   * becomes: a structural chapter's ordinal, pages and DOI, a contained Work's intent, an AVItem's acknowledged loss.
   * Without it only the chapters the adapter's own reduction came with are planned, from that reduction; every other
   * ContentItem of a Work the import creates stands as the gap it is.
   */
  readonly components?: OnixComponentPlan;
  /**
   * The canonical RelatedMaterial reduction of the same source (thoth-app#224), the only authority on what a RelatedWork or
   * RelatedProduct becomes and on a Work's References. Without it no relation is planned and no Reference is created, and a
   * new Work whose source states a citation cannot be planned.
   */
  readonly relatedMaterial?: OnixRelatedMaterialPlan;
  /**
   * What Thoth holds for that reduction (thoth-app#224): the existing Works, in any publisher, each exact endpoint
   * identifier names, and the relations and References of the existing Works the plan's groups resolved to. Without it no
   * endpoint outside the file and no existing edge or Reference is ever assumed.
   */
  readonly relatedMaterialTargets?: OnixRelatedMaterialTargetEvidence;
  /**
   * The canonical collateral reduction of the same source (thoth-app#225), the only authority on what a TextContent or
   * SupportingResource becomes: a new Work's, chapter's or contained Work's abstracts, table of contents and general note,
   * and every AdditionalResource intent. Without it none is planned, and a new Work whose source states collateral cannot
   * be planned at all.
   */
  readonly collateral?: OnixCollateralPlan;
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

/** The type a publisher chose for a format the file leaves open, when it is one of the file's own candidates. */
const chosenTypeOf = (
  manifestation: OnixManifestationDecision,
  choice: OnixManifestationChoice | undefined,
): PublicationType | null =>
  manifestation.kind === 'INPUT_REQUIRED' &&
  choice !== undefined &&
  choice !== ONIX_MANIFESTATION_OMIT &&
  manifestation.candidates.includes(choice)
    ? choice
    : null;

/**
 * What a Product's manifestation becomes with the publisher's choice. An omission counts only where `omittable` says
 * the plan takes one: an omission recorded for any other Product - a stale answer, or one never offered - is no
 * decision at all, and the Publication the file resolves is created.
 */
const manifestationStateOf = (
  node: OnixProductNode,
  choice: OnixManifestationChoice | undefined,
  omittable: boolean,
): ManifestationState => {
  const { manifestation } = node;

  if (choice === ONIX_MANIFESTATION_OMIT && omittable) {
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
    case 'INPUT_REQUIRED': {
      const type = chosenTypeOf(manifestation, choice);

      return type === null ? { kind: 'PENDING' } : { kind: 'TYPE', type, chosen: true };
    }
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

/** The blocker code each class of blocking rights finding stands as (thoth-app#211). */
const RIGHTS_BLOCKER_CODES = {
  SOURCE_CONFLICT: 'RIGHTS_SOURCE_CONFLICT',
  TARGET_INPUT_REQUIRED: 'RIGHTS_INPUT_REQUIRED',
  TARGET_UNREPRESENTABLE: 'RIGHTS_UNREPRESENTABLE',
  PREFLIGHT_GAP: 'RIGHTS_PREFLIGHT_GAP',
} as const satisfies Readonly<Record<OnixRightsFinding['classification'], OnixPlanBlocker['code']>>;

/**
 * The blocker a blocking rights finding stands as. Stage A offers no answer to any rights finding, so it stands until
 * the source changes or a later #184 stage implements its acknowledgement or input; the finding itself stays in the
 * sidecar under `detail.findingKey`.
 */
const rightsBlocker = (finding: OnixRightsFinding, recordKey: string | undefined): OnixPlanBlocker =>
  blocker(
    RIGHTS_BLOCKER_CODES[finding.classification],
    finding.classification,
    { recordKey, productKey: finding.productKey ?? undefined, groupKey: finding.groupKey },
    finding.locations.map(({ path }) => path),
    { findingKey: finding.key, finding: finding.code },
  );

/**
 * The Product-rights findings (thoth-app#211) whose approved target-loss path is a source-bound acknowledgement
 * (thoth-app#217; 5568901904 rules 34, 42, 53, 73): an unsupported or unidentifiable intrinsic licence, a dated
 * licence, non-zero technical protection and a material usage constraint. A conflict, a deferred scope, a gap and a
 * grouped-Work ambiguity are never acknowledgeable (rules 46, 52 of #217).
 */
const RIGHTS_ACKNOWLEDGEABLE_CODES: ReadonlySet<OnixRightsFinding['code']> = new Set<OnixRightsFinding['code']>([
  'RIGHTS_LICENCE_UNSUPPORTED',
  'RIGHTS_LICENCE_UNIDENTIFIED',
  'RIGHTS_LICENCE_DATED',
  'RIGHTS_TECHNICAL_PROTECTION_UNREPRESENTABLE',
  'RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE',
]);

/** List 146: permitted subject to limit, whose limits must be present; permitted unlimited and prohibited take none. */
const PERMITTED_SUBJECT_TO_LIMIT = '02';

/**
 * Whether a blocking rights finding may be acknowledged as an omission. A usage constraint whose status and limits do
 * not agree (5568901904 rules 63-64) is semantically incomplete, not a loss to consent to: it stays blocked.
 */
export const isAcknowledgeableRightsFinding = (finding: OnixRightsFinding): boolean => {
  if (!finding.blocking || !RIGHTS_ACKNOWLEDGEABLE_CODES.has(finding.code)) return false;

  if (finding.code === 'RIGHTS_USAGE_CONSTRAINT_UNREPRESENTABLE') {
    const limits = Array.isArray(finding.detail.limits) ? finding.detail.limits.length : 0;

    return finding.detail.status === PERMITTED_SUBJECT_TO_LIMIT ? limits > 0 : limits === 0;
  }

  return true;
};

/** The blocker an unacknowledged acknowledgeable rights finding stands as: the same class, asking for the answer. */
const rightsAcknowledgementBlocker = (finding: OnixRightsFinding, recordKey: string | undefined): OnixPlanBlocker =>
  blocker(
    'RIGHTS_ACKNOWLEDGEMENT_REQUIRED',
    finding.classification,
    { recordKey, productKey: finding.productKey ?? undefined, groupKey: finding.groupKey },
    finding.locations.map(({ path }) => path),
    { findingKey: finding.key, finding: finding.code },
  );

/**
 * The blocker a blocking SalesRights or ProductContact finding stands as (thoth-app#217): one that offers an
 * acknowledgement waits on it; a source conflict or a gap stands until the source changes.
 */
const salesRightsBlocker = (finding: OnixSalesRightsFinding, recordKey: string | undefined): OnixPlanBlocker => {
  const contact = finding.code.startsWith('PRODUCT_CONTACT_');
  const scope = { recordKey, productKey: finding.productKey, groupKey: finding.groupKey };
  const paths = finding.locations.map(({ path }) => path);
  const detail = { findingKey: finding.key, finding: finding.code };

  if (finding.resolution.kind === 'ACKNOWLEDGE') {
    return blocker(
      contact ? 'PRODUCT_CONTACT_ACKNOWLEDGEMENT_REQUIRED' : 'SALES_RIGHTS_ACKNOWLEDGEMENT_REQUIRED',
      finding.classification === 'TARGET_UNREPRESENTABLE' ? 'TARGET_UNREPRESENTABLE' : 'TARGET_INPUT_REQUIRED',
      scope,
      paths,
      detail,
    );
  }

  if (finding.classification === 'SOURCE_CONFLICT') {
    return blocker('SALES_RIGHTS_SOURCE_CONFLICT', 'SOURCE_CONFLICT', scope, paths, detail);
  }

  return blocker(
    contact ? 'PRODUCT_CONTACT_PREFLIGHT_GAP' : 'SALES_RIGHTS_PREFLIGHT_GAP',
    'PREFLIGHT_GAP',
    scope,
    paths,
    detail,
  );
};

/** Whether an answer acknowledges the finding it is given for. Any other value is stale: never consent. */
const acknowledges = (choices: OnixPlanInputs['rightsChoices'], key: string): boolean =>
  choices?.[key] === ONIX_RIGHTS_ACKNOWLEDGED;

/** How an answer to an acknowledgeable finding stands: given as the acknowledgement, given otherwise, or not given. */
const acknowledgementAnswerOf = (
  choices: OnixPlanInputs['rightsChoices'],
  key: string,
  offered: boolean,
): OnixPlanFinding['answer'] => {
  const value = choices?.[key];

  if (value === undefined) return offered ? { state: 'UNANSWERED' } : { state: 'NOT_APPLICABLE' };

  return offered && value === ONIX_RIGHTS_ACKNOWLEDGED ? { state: 'ANSWERED', value } : { state: 'REJECTED', value };
};

const supportedLicenceLabel = (identity: string, url: string) =>
  `${ONIX_SUPPORTED_LICENCES.find((licence) => licence.identity === identity)?.label ?? identity} (${url})`;

/**
 * What one Work group's `Work.license` becomes (thoth-app#217; 5568901904 rules 116-124), from the rights reduction's
 * decision, the exact existing Work's licence and the acknowledgements given. Existing Work identity never authorises
 * changing its licence: the same supported licence is already present, silence keeps what is there, a materially
 * different licence blocks ordinary import for a separate metadata-update decision, and a supported licence stated for
 * a Work holding none is an explicit decision - to continue without writing it - never an automatic conflict
 * (Correction 1 of the #218 review). Only a new Work is ever created with a licence, and only a supported one. Every
 * reconciliation outcome is a plan finding, keyed as the rights findings are, so that what blocks and what was decided
 * stands in the plan beside the reductions' own findings.
 */
const licenceActionOf = (
  groupKey: string,
  target: OnixWorkTargetAction | null,
  existingWork: OnixExistingWork | null,
  rights: OnixRightsPlan | undefined,
  acknowledged: ReadonlySet<string>,
  choices: OnixPlanInputs['rightsChoices'],
): {
  readonly action: OnixWorkLicenceAction['action'];
  readonly blockers: OnixPlanBlocker[];
  readonly findings: OnixPlanFinding[];
} => {
  const decision = rights?.groups[groupKey]?.licence ?? { kind: 'UNSET' as const };
  const existing = target === 'EXISTING_WORK' ? existingWork : null;
  const existingUrl = existing?.license ?? '';
  const finding = (
    code: string,
    classification: OnixPlanFinding['classification'],
    blocking: boolean,
    resolution: OnixPlanFinding['resolution'],
    locations: readonly OnixSourceLocation[],
    detail: OnixPlanFinding['detail'],
    message: string,
  ): OnixPlanFinding => {
    const key = ['RIGHTS', code, groupKey].join('|');

    return {
      family: 'LICENCE_RECONCILIATION',
      key,
      code,
      classification,
      blocking,
      productKey: null,
      groupKey,
      locations,
      detail,
      resolution,
      answer: acknowledgementAnswerOf(choices, key, resolution.kind === 'ACKNOWLEDGE'),
      message,
    };
  };
  const describeWork = existing === null ? '' : `the existing Work ${existing.workId}`;

  if (decision.kind === 'SET_SUPPORTED_LICENSE') {
    const incoming = supportedLicenceLabel(decision.identity, decision.url);

    if (existing === null) {
      return {
        action: { kind: 'SET_SUPPORTED_LICENSE', identity: decision.identity, url: decision.url },
        blockers: [],
        findings: [],
      };
    }

    if (existingUrl.length > 0 && licenceIdentityOf(existingUrl) === decision.identity) {
      return {
        action: { kind: 'ALREADY_PRESENT', identity: decision.identity, url: decision.url },
        blockers: [],
        findings: [
          finding(
            'RIGHTS_EXISTING_LICENCE_ALREADY_PRESENT',
            'SUPPORTED_NORMALIZED',
            false,
            { kind: 'NONE' },
            decision.locations,
            { workId: existing.workId, existing: existingUrl, incoming: decision.url },
            `${describeWork} already holds the licence the file states (${incoming}); nothing is written`,
          ),
        ],
      };
    }

    if (existingUrl.length > 0) {
      const differs = finding(
        'RIGHTS_EXISTING_LICENCE_DIFFERS',
        'EXECUTION_DEFERRED',
        true,
        { kind: 'NONE' },
        decision.locations,
        { workId: existing.workId, existing: existingUrl, incoming: decision.url },
        `${describeWork} holds the licence ${existingUrl} and the file states ${incoming}; this import never changes an existing Work's licence, so it cannot continue as an ordinary import - update the Work separately`,
      );

      return {
        action: { kind: 'BLOCKED' },
        blockers: [
          blocker(
            'RIGHTS_EXISTING_LICENCE_DIFFERS',
            'EXECUTION_DEFERRED',
            { groupKey },
            decision.locations.map(({ path }) => path),
            {
              findingKey: differs.key,
              finding: differs.code,
              workId: existing.workId,
              existing: existingUrl,
              incoming: decision.url,
            },
          ),
        ],
        findings: [differs],
      };
    }

    // No licence held, a supported one stated: the publisher decides that it is not written, or updates the Work.
    const notSet = finding(
      'RIGHTS_EXISTING_LICENCE_NOT_SET',
      'TARGET_INPUT_REQUIRED',
      true,
      { kind: 'ACKNOWLEDGE' },
      decision.locations,
      { workId: existing.workId, incoming: decision.url, identity: decision.identity },
      `${describeWork} holds no licence and the file states ${incoming}; this import never sets an existing Work's licence. Continue without writing it, or update the Work separately`,
    );

    if (notSet.answer.state === 'ANSWERED') {
      return {
        action: { kind: 'OMIT_WITH_ACKNOWLEDGED_LOSS', findingKeys: [notSet.key] },
        blockers: [],
        findings: [notSet],
      };
    }

    return {
      action: { kind: 'BLOCKED' },
      blockers: [
        blocker(
          'RIGHTS_ACKNOWLEDGEMENT_REQUIRED',
          'TARGET_INPUT_REQUIRED',
          { groupKey },
          decision.locations.map(({ path }) => path),
          { findingKey: notSet.key, finding: notSet.code },
        ),
      ],
      findings: [notSet],
    };
  }

  if (decision.kind === 'UNSET') {
    if (existingUrl.length === 0) return { action: { kind: 'UNSET' }, blockers: [], findings: [] };

    return {
      action: { kind: 'EXISTING_PRESERVED', url: existingUrl },
      blockers: [],
      findings: [
        finding(
          'RIGHTS_EXISTING_LICENCE_PRESERVED',
          'SUPPORTED_NORMALIZED',
          false,
          { kind: 'NONE' },
          [],
          { workId: (existing as OnixExistingWork).workId, existing: existingUrl },
          `${describeWork} holds the licence ${existingUrl} and the file states none; it is kept as it is`,
        ),
      ],
    };
  }

  if (existing !== null && existingUrl.length > 0) {
    const unverified = finding(
      'RIGHTS_EXISTING_LICENCE_UNVERIFIED',
      'EXECUTION_DEFERRED',
      true,
      { kind: 'NONE' },
      [],
      { workId: existing.workId, existing: existingUrl, findingKeys: decision.findingKeys },
      `${describeWork} holds the licence ${existingUrl} and the file states one Thoth cannot identify, so the two cannot be compared; this import never changes an existing Work's licence - update the Work separately`,
    );

    return {
      action: { kind: 'BLOCKED' },
      blockers: [
        blocker('RIGHTS_EXISTING_LICENCE_UNVERIFIED', 'EXECUTION_DEFERRED', { groupKey }, [], {
          findingKey: unverified.key,
          finding: unverified.code,
          workId: existing.workId,
          existing: existingUrl,
          findingKeys: decision.findingKeys,
        }),
      ],
      findings: [unverified],
    };
  }

  return decision.findingKeys.every((key) => acknowledged.has(key))
    ? { action: { kind: 'OMIT_WITH_ACKNOWLEDGED_LOSS', findingKeys: decision.findingKeys }, blockers: [], findings: [] }
    : { action: { kind: 'BLOCKED' }, blockers: [], findings: [] };
};

/** What a publisher's answer to one commercial finding is, against what the finding offers. */
type PriceAnswer =
  /** No answer: a required decision still waits, and an optional one keeps its default. */
  | { readonly kind: 'UNANSWERED' }
  | { readonly kind: 'CANDIDATE'; readonly candidate: OnixPriceCandidate }
  | { readonly kind: 'OMIT' }
  /** An answer the finding does not offer, or given to a finding that offers none: never ignored, never defaulted. */
  | { readonly kind: 'STALE'; readonly answer: string };

/**
 * The publisher's answer to a commercial finding: the candidate whose amount the Price takes, `OMIT` for no Price, or a
 * stale answer - a key the price decision does not offer, or any answer to a finding that is no price decision.
 */
const priceAnswerOf = (finding: OnixCommercialFinding, choices: OnixPlanInputs['commercialChoices']): PriceAnswer => {
  const answer = choices?.[finding.key];

  if (answer === undefined) return { kind: 'UNANSWERED' };

  if (finding.resolution.kind !== 'PRICE_CHOICE' && finding.resolution.kind !== 'PRICE_OVERRIDE') {
    return { kind: 'STALE', answer };
  }

  if (answer === ONIX_PRICE_OMIT) return { kind: 'OMIT' };

  const candidate = finding.resolution.candidates.find(({ key }) => key === answer);

  return candidate === undefined ? { kind: 'STALE', answer } : { kind: 'CANDIDATE', candidate };
};

/**
 * The blocker a blocking commercial finding stands as (thoth-app#215). A price decision stands until the publisher
 * answers it; any other finding until the source changes or a later #184 stage implements its answer. A blocking finding
 * of a class that never blocks is a shape the reduction did not expect, and is never passed through.
 */
const commercialBlocker = (finding: OnixCommercialFinding, recordKey: string | undefined): OnixPlanBlocker => {
  const scope = { recordKey, productKey: finding.productKey, groupKey: finding.groupKey };
  const paths = finding.locations.map(({ path }) => path);
  const detail = { findingKey: finding.key, finding: finding.code };

  // A price decision waits on the publisher's answer: prices that contradict each other stay unrepresentable until then
  // (rule 29), prices never taken by themselves an input the publisher gives (rule 25).
  if (finding.resolution.kind === 'PRICE_CHOICE') {
    return blocker(
      'COMMERCIAL_CHOICE_REQUIRED',
      finding.classification === 'TARGET_UNREPRESENTABLE' ? 'TARGET_UNREPRESENTABLE' : 'TARGET_INPUT_REQUIRED',
      scope,
      paths,
      detail,
    );
  }

  switch (finding.classification) {
    case 'TARGET_UNREPRESENTABLE':
      return blocker('COMMERCIAL_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', scope, paths, detail);
    case 'TARGET_INPUT_REQUIRED':
      return blocker('COMMERCIAL_INPUT_REQUIRED', 'TARGET_INPUT_REQUIRED', scope, paths, detail);
    default:
      return blocker('COMMERCIAL_PREFLIGHT_GAP', 'PREFLIGHT_GAP', scope, paths, detail);
  }
};

/**
 * How an accessibility answer stands against the finding it is given for (thoth-app#221): no answer, an answer the finding
 * offers, or one it does not - which is never applied, and which a finding no answer resolves always is.
 */
const accessibilityAnswerOf = (
  finding: Pick<OnixAccessibilityFinding, 'key' | 'resolution'>,
  choices: OnixPlanInputs['accessibilityChoices'],
): OnixPlanFinding['answer'] => {
  const value = choices?.[finding.key];

  if (value === undefined) {
    return finding.resolution.kind === 'NONE' ? { state: 'NOT_APPLICABLE' } : { state: 'UNANSWERED' };
  }

  return isOfferedOnixAccessibilityAnswer(finding, value) ? { state: 'ANSWERED', value } : { state: 'REJECTED', value };
};

/**
 * The blocker an accessibility or ProductFormFeature finding a Publication waits on stands as (thoth-app#221): a choice
 * waits on the publisher's answer, a material loss on its acknowledgement, and a gap on nothing the app can give.
 */
const accessibilityBlocker = (
  code:
    | 'ACCESSIBILITY_CHOICE_REQUIRED'
    | 'ACCESSIBILITY_ACKNOWLEDGEMENT_REQUIRED'
    | 'ACCESSIBILITY_PREFLIGHT_GAP'
    | 'PRODUCT_FORM_FEATURE_ACKNOWLEDGEMENT_REQUIRED',
  finding: OnixAccessibilityFinding,
  recordKey: string | undefined,
): OnixPlanBlocker =>
  blocker(
    code,
    code === 'ACCESSIBILITY_PREFLIGHT_GAP'
      ? 'PREFLIGHT_GAP'
      : code !== 'ACCESSIBILITY_CHOICE_REQUIRED' && finding.classification === 'TARGET_UNREPRESENTABLE'
        ? 'TARGET_UNREPRESENTABLE'
        : 'TARGET_INPUT_REQUIRED',
    { recordKey, productKey: finding.productKey, groupKey: finding.groupKey },
    finding.locations.map(({ path }) => path),
    {
      findingKey: finding.key,
      finding: finding.code,
      ...(finding.publicationType === null ? {} : { publicationType: finding.publicationType }),
    },
  );

/**
 * The blocker an unresolved blocking component finding stands as (thoth-app#223), by how it can be answered: a choice or an
 * input waits on the publisher, a loss on its acknowledgement, and anything else on what its class says - the source, a
 * later stage's execution, or nothing the app can give. The finding stays in the sidecar under `detail.findingKey`.
 */
const componentBlocker = (finding: OnixComponentFinding, recordKey: string | undefined): OnixPlanBlocker => {
  const scope = { recordKey, productKey: finding.productKey, groupKey: finding.groupKey };
  const paths = finding.locations.map(({ path }) => path);
  const detail = {
    findingKey: finding.key,
    finding: finding.code,
    ...(finding.componentKey === null ? {} : { componentKey: finding.componentKey }),
  };

  switch (finding.resolution.kind) {
    case 'CHOICE':
      return blocker('COMPONENT_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', scope, paths, detail);
    case 'INPUT':
      return blocker('COMPONENT_INPUT_REQUIRED', 'TARGET_INPUT_REQUIRED', scope, paths, detail);
    case 'ACKNOWLEDGE':
      return blocker(
        'COMPONENT_ACKNOWLEDGEMENT_REQUIRED',
        finding.classification === 'TARGET_UNREPRESENTABLE' ? 'TARGET_UNREPRESENTABLE' : 'TARGET_INPUT_REQUIRED',
        scope,
        paths,
        detail,
      );
    default:
      break;
  }

  switch (finding.classification) {
    case 'SOURCE_CONFLICT':
      return blocker('COMPONENT_SOURCE_CONFLICT', 'SOURCE_CONFLICT', scope, paths, detail);
    case 'TARGET_INPUT_REQUIRED':
      return blocker('COMPONENT_INPUT_REQUIRED', 'TARGET_INPUT_REQUIRED', scope, paths, detail);
    case 'TARGET_UNREPRESENTABLE':
      return blocker('COMPONENT_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', scope, paths, detail);
    case 'EXECUTION_DEFERRED':
      return blocker('COMPONENT_EXECUTION_DEFERRED', 'EXECUTION_DEFERRED', scope, paths, detail);
    default:
      // A blocking finding of any other class is a shape the reduction did not expect: never passed through.
      return blocker('COMPONENT_PREFLIGHT_GAP', 'PREFLIGHT_GAP', scope, paths, detail);
  }
};

/**
 * The blocker an unresolved blocking relation or Reference finding stands as (thoth-app#224), by how it can be answered: a
 * choice waits on the publisher, a loss on its acknowledgement, and anything else on what its class says - the source, the
 * relation stage of #187, or nothing the app can give. The finding stays in the sidecar under `detail.findingKey`.
 */
const relatedMaterialBlocker = (
  finding: OnixRelatedMaterialFinding,
  recordKey: string | undefined,
): OnixPlanBlocker => {
  const scope = { recordKey, productKey: finding.productKey ?? undefined, groupKey: finding.groupKey };
  const paths = finding.locations.map(({ path }) => path);
  const detail = { findingKey: finding.key, finding: finding.code };
  const reference = finding.family === 'REFERENCE';

  switch (finding.resolution.kind) {
    case 'CHOICE':
      return blocker('RELATION_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', scope, paths, detail);
    case 'ACKNOWLEDGE':
      return blocker(
        reference ? 'REFERENCE_ACKNOWLEDGEMENT_REQUIRED' : 'RELATION_ACKNOWLEDGEMENT_REQUIRED',
        finding.classification === 'TARGET_UNREPRESENTABLE' ? 'TARGET_UNREPRESENTABLE' : 'TARGET_INPUT_REQUIRED',
        scope,
        paths,
        detail,
      );
    default:
      break;
  }

  switch (finding.classification) {
    case 'SOURCE_CONFLICT':
      return blocker(
        reference ? 'REFERENCE_SOURCE_CONFLICT' : 'RELATION_SOURCE_CONFLICT',
        'SOURCE_CONFLICT',
        scope,
        paths,
        detail,
      );
    case 'TARGET_UNREPRESENTABLE':
      if (!reference) return blocker('RELATION_UNREPRESENTABLE', 'TARGET_UNREPRESENTABLE', scope, paths, detail);
      break;
    case 'EXECUTION_DEFERRED':
      if (!reference) return blocker('RELATION_EXECUTION_DEFERRED', 'EXECUTION_DEFERRED', scope, paths, detail);
      break;
    default:
      break;
  }

  // A blocking finding of any other class is a shape the reduction did not expect: never passed through.
  return blocker(
    reference ? 'REFERENCE_PREFLIGHT_GAP' : 'RELATION_PREFLIGHT_GAP',
    'PREFLIGHT_GAP',
    scope,
    paths,
    detail,
  );
};

/**
 * The blocker an unresolved blocking collateral finding stands as (thoth-app#225), by how it can be answered: a choice or a
 * locale waits on the publisher, a loss on its acknowledgement, a planned AdditionalResource on #187, and anything else on
 * nothing the app can give. The finding stays in the sidecar under `detail.findingKey`.
 */
const collateralBlocker = (finding: OnixCollateralFinding, recordKey: string | undefined): OnixPlanBlocker => {
  const scope = { recordKey, productKey: finding.productKey ?? undefined, groupKey: finding.groupKey };
  const paths = finding.locations.map(({ path }) => path);
  const detail = {
    findingKey: finding.key,
    finding: finding.code,
    ...(finding.componentPath === null ? {} : { componentPath: finding.componentPath }),
  };

  switch (finding.resolution.kind) {
    case 'CHOICE':
      return blocker('COLLATERAL_CHOICE_REQUIRED', 'TARGET_INPUT_REQUIRED', scope, paths, detail);
    case 'INPUT':
      return blocker('COLLATERAL_INPUT_REQUIRED', 'TARGET_INPUT_REQUIRED', scope, paths, detail);
    case 'ACKNOWLEDGE':
      return blocker(
        'COLLATERAL_ACKNOWLEDGEMENT_REQUIRED',
        finding.classification === 'TARGET_UNREPRESENTABLE' ? 'TARGET_UNREPRESENTABLE' : 'TARGET_INPUT_REQUIRED',
        scope,
        paths,
        detail,
      );
    default:
      // A planned AdditionalResource waits on #187; a blocking finding of any other kind is never passed through.
      return finding.classification === 'EXECUTION_DEFERRED'
        ? blocker('COLLATERAL_EXECUTION_DEFERRED', 'EXECUTION_DEFERRED', scope, paths, detail)
        : blocker('COLLATERAL_PREFLIGHT_GAP', 'PREFLIGHT_GAP', scope, paths, detail);
  }
};

/** The locale of the canonical title among a scope's planned titles, where one is resolved. */
const canonicalLocaleOf = (titles: readonly { readonly canonical: boolean; readonly localeCode: string }[]) =>
  titles.find(({ canonical }) => canonical)?.localeCode ?? null;

/** A relation endpoint as the format-neutral plan names it: the new Work's id in `works`, or the existing Work's. */
const importEndpointOf = (endpoint: OnixRelationEndpoint): ImportRelationEdge['relator'] | null =>
  endpoint.kind === 'EXISTING_WORK'
    ? { kind: 'EXISTING_WORK', workId: endpoint.workId }
    : endpoint.plannedWorkId === null
      ? null
      : { kind: 'PLANNED_WORK', workId: endpoint.plannedWorkId };

const ACCESSIBILITY_FIELDS: readonly OnixAccessibilityField[] = [
  'accessibilityStandard',
  'accessibilityAdditionalStandard',
  'accessibilityException',
  'accessibilityReportUrl',
];

const ACCESSIBILITY_FIELD_NAMES: Readonly<Record<OnixAccessibilityField, string>> = {
  accessibilityStandard: 'accessibility standard',
  accessibilityAdditionalStandard: 'additional accessibility standard',
  accessibilityException: 'accessibility exception',
  accessibilityReportUrl: 'accessibility report URL',
};

/** Accessibility fields said plainly: `accessibility standard WCAG21AA, accessibility report URL https://...`. */
const describeAccessibility = (
  state: OnixPublicationAccessibilityState,
  fields: readonly OnixAccessibilityField[] = ACCESSIBILITY_FIELDS,
) =>
  fields
    .filter((field) => state[field] !== null)
    .map((field) => `${ACCESSIBILITY_FIELD_NAMES[field]} ${state[field]}`)
    .join(', ') || 'no accessibility fields';

/**
 * How the source's accessibility for a Publication compares with what the existing Publication holds (thoth-app#221;
 * 5571562316 rules 91-98), field by field. A field the source leaves empty keeps what is held; the same value is
 * nothing to do; a value for a field held empty is a bounded enrichment - but only where the Publication it would make
 * is one the database holds - and any other difference is a conflict. Nothing here is ever written.
 */
const reconcileExistingAccessibility = (
  existing: OnixExistingPublication,
  source: OnixPublicationAccessibilityState,
):
  | { readonly kind: 'EXISTING_PRESERVED' | 'NOOP' }
  | { readonly kind: 'ENRICHMENT_DEFERRED' | 'CONFLICT'; readonly fields: readonly OnixAccessibilityField[] } => {
  const held = existing.accessibility;
  const stated = ACCESSIBILITY_FIELDS.filter((field) => source[field] !== null);

  if (stated.length === 0) return { kind: 'EXISTING_PRESERVED' };

  const same = (field: OnixAccessibilityField) =>
    field === 'accessibilityReportUrl'
      ? held.accessibilityReportUrl?.trim() === source.accessibilityReportUrl
      : held[field] === source[field];
  const conflicts = stated.filter((field) => held[field] !== null && !same(field));
  const fills = stated.filter((field) => held[field] === null);
  const enriched: OnixPublicationAccessibilityState = {
    ...held,
    ...Object.fromEntries(fills.map((field) => [field, source[field]])),
  };

  if (conflicts.length > 0) return { kind: 'CONFLICT', fields: conflicts };
  // Filling an empty field must not make a Publication the database refuses: a held exception beside a stated standard.
  if (!isRepresentableOnixAccessibility(existing.type, enriched)) return { kind: 'CONFLICT', fields: fills };

  return fills.length > 0 ? { kind: 'ENRICHMENT_DEFERRED', fields: fills } : { kind: 'NOOP' };
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

/** The candidate Work the adapter built for a group, where it built one. */
const candidateWorkOf = (
  context: Pick<OnixPlanResolutionContext, 'candidatePlan'>,
  adapted: OnixAdaptedGroup | undefined,
): WorkEntity | undefined =>
  adapted === undefined ? undefined : context.candidatePlan?.works.find(({ id }) => id === adapted.workId);

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
  /** Each Product's manifestation as decided, filled in as its Work group is resolved below. */
  const manifestationOf = new Map<string, ManifestationState>();

  /**
   * The Products whose Publication type another Product of their Work also takes, as the file resolves it or the
   * publisher chose it. A Work holds one Publication per type, so such a Publication is a loss an omission may
   * acknowledge (5545771626 rule 47, 5543749368 rule 116) - whichever of the twins is left out.
   */
  const twins = new Set<string>();

  sourcePlan.groups.forEach(({ groupKey }) => {
    const byType = new Map<PublicationType, string[]>();

    sourcePlan.products
      .filter((node) => node.groupKey === groupKey)
      .forEach(({ productKey, manifestation }) => {
        const type =
          manifestation.kind === 'RESOLVED' ? manifestation.type : chosenTypeOf(manifestation, choiceOf(productKey));

        if (type !== null) byType.set(type, [...(byType.get(type) ?? []), productKey]);
      });
    byType.forEach((productKeys) => {
      if (productKeys.length > 1) productKeys.forEach((productKey) => twins.add(productKey));
    });
  });

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
  const profileActiveOf = (groupKey: string) =>
    sourcePlan.groups.find((group) => group.groupKey === groupKey)?.compatibility === 'THOTH_PROFILE' &&
    compatibilityActive(groupTargets.get(groupKey)?.verification ?? 'NOT_APPLICABLE');

  /*
   * The canonical References every Product states (thoth-app#224): each RelatedProduct/34 at its source position, read with
   * Thoth's own unstructured-citation convention only where its Work's compatibility profile is verified or confirmed
   * (5541586341 rule 46). A new Work is created with its Products' one sequence; an attaching Product's is compared with its
   * existing Work's (#224 Amendment 1), which is never written.
   */
  const relatedMaterial = context.relatedMaterial;
  const relatedMaterialChoices = inputs.relatedMaterialChoices;
  const productReferenceResults = new Map(
    relatedMaterial === undefined
      ? []
      : sourcePlan.products.map((node) => [
          node.productKey,
          resolveOnixProductReferences(relatedMaterial, node.productKey, node.groupKey, {
            thothProfileActive: profileActiveOf(node.groupKey),
            choices: relatedMaterialChoices,
            describe: describe(representative(node.productKey)),
          }),
        ]),
  );
  const referenceCompatibility: OnixReferenceCompatibility[] = [];
  /** The languages each Work is planned with or holds: what a translation direction may be backed by (rule 19). */
  const languageCodesByGroup = new Map<string, readonly string[]>();
  const representativeByGroup = new Map<string, string>();

  const targetBlockers: OnixPlanBlocker[] = [];
  const plannedProducts = new Map<string, OnixPlannedProduct>();

  /*
   * The rights and contact acknowledgements the reductions offer and the publisher has given (thoth-app#217): a
   * Product-rights finding whose approved target-loss path is an acknowledgement, or a SalesRights or ProductContact
   * finding that offers one. Every other answer is stale (below). An acknowledgement only lets the import continue
   * while knowingly omitting the fact; nothing is created from it.
   */
  const rightsFindingByKey = new Map((context.rights?.findings ?? []).map((finding) => [finding.key, finding]));
  const salesRightsFindingByKey = new Map(
    (context.salesRights?.findings ?? []).map((finding) => [finding.key, finding]),
  );
  const acknowledgedRights = new Set(
    [...rightsFindingByKey.values()]
      .filter((finding) => isAcknowledgeableRightsFinding(finding) && acknowledges(inputs.rightsChoices, finding.key))
      .map(({ key }) => key),
  );
  const acknowledgedRightsFindingKeys: string[] = [];
  const licenceActions: OnixWorkLicenceAction[] = [];
  /*
   * The accessibility reduction's findings (thoth-app#221), what each Publication's accessibility comes to, the resolver's
   * own existing-Publication comparisons, and every finding that applies to a Publication as the plan now types it.
   */
  const accessibilityChoices = inputs.accessibilityChoices;
  const accessibilityFindingByKey = new Map(
    (context.accessibility?.findings ?? []).map((finding) => [finding.key, finding]),
  );
  const accessibilityActions: OnixPublicationAccessibilityAction[] = [];
  const accessibilityReconciliation: OnixPlanFinding[] = [];
  const applicableAccessibilityKeys = new Set<string>();
  /** The resolver's own existing-Work licence reconciliation findings, one list for every group. */
  const reconciliationFindings: OnixPlanFinding[] = [];
  const plannedGroups: OnixPlannedWorkGroup[] = [];
  const descriptiveFindings: OnixDescriptiveFinding[] = [];
  const descriptiveCompatibility: OnixDescriptiveCompatibility[] = [];
  const builtByGroup = new Map<string, OnixBuiltDescriptiveWork>();
  const seriesEntries: OnixSeriesPlanEntry[] = [];
  /*
   * The component reductions the plan was resolved with (thoth-app#223): the one given, or - for a caller that gave none -
   * the adapter's own for the chapters it built candidates for; what each component of each new Work becomes; the findings
   * only the answers raised; and every component finding that applies to a planned Work.
   */
  const componentChoices = inputs.componentChoices;
  const componentPlans = new Set<OnixComponentPlan>(context.components === undefined ? [] : [context.components]);
  const componentIntents: OnixComponentIntent[] = [];
  const raisedComponentFindings: OnixComponentFinding[] = [];
  const applicableComponentKeys = new Set<string>();
  /*
   * The collateral reduction the plan was resolved with (thoth-app#225): what each new Work's, chapter's and contained Work's
   * collateral comes to, the findings only the answers raised, and every one that applies to a planned Work.
   */
  const collateralChoices = inputs.collateralChoices ?? {};
  const planCollateralFindingByKey = new Map(
    (context.collateral?.findings ?? []).map((finding): [string, OnixCollateralFinding] => [finding.key, finding]),
  );
  const collateralActions: OnixCollateralTargetAction[] = [];
  const raisedCollateralFindings: OnixCollateralFinding[] = [];
  const applicableCollateralKeys = new Set<string>();

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

    if (members[0] !== undefined) representativeByGroup.set(group.groupKey, members[0].productKey);
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
        }
      }

      /*
       * The omissions the plan takes. A format the file leaves open, or a package Thoth cannot hold, is the publisher's
       * to leave out whatever else holds. A Publication the file resolves is created, unless it is one this import
       * cannot create: a type its Work already takes from another Product, or an attachment to an existing Work.
       */
      const omittable =
        node.manifestation.kind === 'RESOLVED'
          ? action === null &&
            !blocked &&
            (target === 'EXISTING_WORK' || (target === 'NEW_WORK' && twins.has(productKey)))
          : node.manifestation.kind === 'INPUT_REQUIRED' || node.manifestation.acknowledgementRequired;
      const manifestation = manifestationStateOf(node, choiceOf(productKey), omittable);

      manifestationOf.set(productKey, manifestation);

      if (action === null && !blocked && target === 'EXISTING_WORK' && existingWork !== null) {
        if (manifestation.kind === 'OMITTED') {
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
          // A RelatedProduct stating code 34 beside another code is a citation the structural probe does not see: the
          // canonical reduction does, and its References are compared all the same.
          const citations = relatedMaterial?.citations[productKey] ?? [];
          const assertions =
            citations.length > 0 && !node.compatibilityAssertions.some(({ family }) => family === 'REFERENCES')
              ? [
                  ...node.compatibilityAssertions,
                  {
                    family: 'REFERENCES' as const,
                    owner: 'APP-IMPORT-ONIX-REL-01' as const,
                    ownerIssue: '#185',
                    locations: citations.map(({ path, sourcePath }) => ({ path, sourcePath })),
                  },
                ]
              : node.compatibilityAssertions;

          assertions.forEach(({ family, owner, ownerIssue, locations }) => {
            const paths = locations.map(({ path }) => path);
            const detail = {
              workId: existingWork.workId,
              publicationType: manifestation.type,
              family,
              owner,
              ownerIssue,
            };

            /*
             * References (#224 Amendment 1): the family is first reduced canonically; while any finding about it stands
             * it stays unverified, and otherwise the ordered sequence is compared, field by represented field, with the
             * existing Work's. The existing Work's References are never updated.
             */
            if (family === 'REFERENCES' && relatedMaterial !== undefined) {
              const reduced = productReferenceResults.get(productKey);
              const pending = reduced?.references.pendingFindingKeys ?? [];
              const held = context.relatedMaterialTargets?.references[existingWork.workId];
              const comparison =
                pending.length > 0
                  ? { outcome: 'UNVERIFIED' as const, reasons: ['REFERENCE_FINDINGS_UNRESOLVED'] }
                  : held === undefined
                    ? { outcome: 'UNVERIFIED' as const, reasons: ['EXISTING_REFERENCES_NOT_READ'] }
                    : compareOnixExistingReferences(reduced?.references.references ?? [], held);

              referenceCompatibility.push({
                productKey,
                groupKey: group.groupKey,
                workId: existingWork.workId,
                outcome: comparison.outcome,
                reasons: comparison.reasons,
                findingKeys: pending,
              });
              pending.forEach((key) => {
                const finding = reduced?.findings.find((candidate) => candidate.key === key);

                if (finding !== undefined) productBlockers.push(relatedMaterialBlocker(finding, record?.recordKey));
              });

              if (comparison.outcome === 'COMPATIBLE') return;

              standing += 1;
              productBlockers.push(
                comparison.outcome === 'CONTRADICTED'
                  ? blocker('EXISTING_WORK_REFERENCE_CONTRADICTION', 'SOURCE_CONFLICT', scope, paths, {
                      ...detail,
                      reasons: comparison.reasons,
                    })
                  : blocker('EXISTING_WORK_COMPATIBILITY_UNVERIFIED', 'PREFLIGHT_GAP', scope, paths, {
                      ...detail,
                      reasons: comparison.reasons,
                      findingKeys: pending,
                    }),
              );

              return;
            }

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
        omittable,
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
      languageCodesByGroup.set(
        group.groupKey,
        existingWork.descriptive.languages.map(({ code }) => code),
      );

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
    /** The new Work's own planned titles and built chapters: what its collateral's canonical abstract may follow. */
    let workTitles: readonly { readonly canonical: boolean; readonly localeCode: string }[] = [];
    let builtWork: OnixBuiltDescriptiveWork | null = null;

    /* The descriptive Work a new Work group becomes, and whatever about it is still unanswered (thoth-app#183). */
    if (target === 'NEW_WORK') {
      const state = descriptiveStateOf(descriptive, group.groupKey, descriptiveOptions, adapted);
      const byKey = new Map(state.findings.map((finding) => [finding.key, finding]));
      const findingSource = (finding: OnixDescriptiveFinding) =>
        representative(finding.productKey ?? members[0]?.productKey ?? '');

      if (state.built !== null) builtByGroup.set(group.groupKey, state.built);
      workTitles = state.values.titles;
      builtWork = state.built;
      languageCodesByGroup.set(
        group.groupKey,
        state.values.languages.map(({ code }) => code),
      );

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

    /*
     * Its components (thoth-app#223). A new Work is planned with its representative Product's components - the Products
     * a Work groups must state the same ones to be one Work at all - as the canonical component reduction decides them:
     * each chapter's ordinal, pages and DOI, each contained Work's intent, each AVItem's loss. Every blocking finding
     * stands as a blocker of its own until it is answered, and a contained Work always does, because its creation is
     * #187's. Without the reduction a component is never planned from anything else: only the chapters the adapter's own
     * reduction came with are, and every other ContentItem stands as the gap it is. A component of a Work this import
     * does not create is never planned; one that would be a Work or a loss of its own holds the group, as it always has.
     */
    const representativeNode = members[0];
    const groupIntents: OnixComponentIntent[] = [];

    if (target === 'NEW_WORK' && representativeNode !== undefined) {
      const componentPlan = context.components ?? adapted?.components;
      const kinds = context.components === undefined ? 'CHAPTERS' : 'ALL';
      const recordKey = representative(representativeNode.productKey)?.recordKey;
      const unplanned = (item: OnixProductNode['contentItems'][number]) =>
        groupBlockers.push(
          blocker(
            'COMPONENT_UNSUPPORTED',
            'PREFLIGHT_GAP',
            { recordKey, productKey: representativeNode.productKey, groupKey: group.groupKey },
            [item.path],
            { kind: item.kind },
          ),
        );

      if (componentPlan === undefined) {
        representativeNode.contentItems.forEach(unplanned);
      } else {
        if (kinds === 'CHAPTERS')
          representativeNode.contentItems.filter(({ kind }) => kind !== 'CHAPTER').forEach(unplanned);

        const candidate = candidateWorkOf(context, adapted);
        const imprintName = representativeNode.imprintName;
        const resolved = resolveOnixComponents(componentPlan, {
          groupKey: group.groupKey,
          productKey: representativeNode.productKey,
          choices: componentChoices,
          // The parent Work's imprint as it is already resolved: the adapted candidate's, else the exact imprint named.
          parent: {
            plannedWorkId: adapted?.workId ?? null,
            imprintId:
              candidate?.imprintId || (imprintName === null ? undefined : imprintIdByName.get(imprintName)) || null,
          },
          chapterWorkIds: adapted?.descriptive.chapterWorkIds ?? {},
          descriptive,
          kinds,
        });
        const findingByKey = new Map(
          [...componentPlan.findings, ...resolved.raised].map((finding) => [finding.key, finding]),
        );

        componentPlans.add(componentPlan);
        componentIntents.push(...resolved.intents);
        groupIntents.push(...resolved.intents);
        raisedComponentFindings.push(...resolved.raised);
        resolved.findingKeys.forEach((key) => applicableComponentKeys.add(key));
        resolved.pendingFindingKeys.forEach((key) => {
          const finding = findingByKey.get(key);

          groupBlockers.push(
            finding === undefined
              ? blocker('COMPONENT_PREFLIGHT_GAP', 'PREFLIGHT_GAP', { groupKey: group.groupKey }, [], {
                  findingKey: key,
                })
              : componentBlocker(finding, representative(finding.productKey)?.recordKey),
          );
        });
      }
    } else if (target === 'EXISTING_WORK') {
      members.forEach(({ productKey, contentItems }) =>
        contentItems
          .filter(({ kind }) => kind !== 'CHAPTER')
          .forEach(({ kind, path }) =>
            groupBlockers.push(
              blocker(
                'COMPONENT_UNSUPPORTED',
                'EXECUTION_DEFERRED',
                { recordKey: representative(productKey)?.recordKey, productKey, groupKey: group.groupKey },
                [path],
                { kind, reason: 'EXISTING_WORK' },
              ),
            ),
          ),
      );
    }

    /*
     * Its collateral (thoth-app#225). A new Work takes the abstracts, table of contents and general note its grouped Products'
     * TextContents come to, and an AdditionalResource intent for every Work resource the source or the publisher projects,
     * each waiting on #187, which creates it; each chapter and contained Work planned for it takes its own ContentItem's,
     * never the Work's, and the Work never takes theirs. Every blocking finding stands as a blocker of its own until it is
     * answered. An existing Work is never written. Without the reduction no collateral is planned, and a new Work whose source
     * states any cannot be planned at all.
     */
    if (context.collateral === undefined) {
      const asserted =
        target === 'NEW_WORK'
          ? members.flatMap(({ compatibilityAssertions }) =>
              compatibilityAssertions
                .filter(({ family }) => family === 'COLLATERAL')
                .flatMap(({ locations }) => locations),
            )
          : [];

      if (asserted.length > 0) {
        groupBlockers.push(
          blocker(
            'COLLATERAL_PREFLIGHT_GAP',
            'PREFLIGHT_GAP',
            { groupKey: group.groupKey },
            asserted.map(({ path }) => path),
            { reason: 'COLLATERAL_NOT_REDUCED' },
          ),
        );
      }
    } else if (target === 'EXISTING_WORK') {
      collateralActions.push({
        groupKey: group.groupKey,
        productKey: null,
        componentPath: null,
        target: 'WORK',
        action: 'EXISTING_WORK_NOT_UPDATED',
        abstracts: [],
        tableOfContents: null,
        generalNote: null,
        resources: [],
        findingKeys: [],
        pendingFindingKeys: [],
      });
    } else if (target === 'NEW_WORK') {
      const collateral = context.collateral;
      const settle = (
        resolvedCollateral: OnixResolvedCollateral,
        scope: Pick<OnixCollateralTargetAction, 'productKey' | 'componentPath' | 'target'>,
      ) => {
        const raisedByKey = new Map(resolvedCollateral.raised.map((finding) => [finding.key, finding]));
        const deferred = new Set(resolvedCollateral.resources.map(({ findingKey }) => findingKey));

        raisedCollateralFindings.push(...resolvedCollateral.raised);
        resolvedCollateral.findingKeys.forEach((key) => applicableCollateralKeys.add(key));
        resolvedCollateral.pendingFindingKeys.forEach((key) => {
          const finding = raisedByKey.get(key) ?? planCollateralFindingByKey.get(key);

          groupBlockers.push(
            finding === undefined
              ? blocker('COLLATERAL_PREFLIGHT_GAP', 'PREFLIGHT_GAP', { groupKey: group.groupKey }, [], {
                  findingKey: key,
                })
              : collateralBlocker(
                  finding,
                  representative(finding.productKey ?? members[0]?.productKey ?? '')?.recordKey,
                ),
          );
        });
        collateralActions.push({
          groupKey: group.groupKey,
          ...scope,
          // A planned AdditionalResource always waits on #187; the collateral is planned once nothing else does.
          action: resolvedCollateral.pendingFindingKeys.some((key) => !deferred.has(key)) ? 'BLOCKED' : 'PLANNED',
          abstracts: resolvedCollateral.abstracts,
          tableOfContents: resolvedCollateral.tableOfContents,
          generalNote: resolvedCollateral.generalNote,
          resources: resolvedCollateral.resources,
          findingKeys: resolvedCollateral.findingKeys,
          pendingFindingKeys: resolvedCollateral.pendingFindingKeys,
        });
      };

      settle(
        resolveOnixCollateralWork(
          collateral,
          group.groupKey,
          members.map(({ productKey }) => productKey),
          {
            choices: collateralChoices,
            canonicalTitleLocale: canonicalLocaleOf(workTitles),
            describe:
              members.length > 1
                ? `the Work of ${members.length} grouped products`
                : describe(representative(members[0]?.productKey ?? '')),
          },
        ),
        { productKey: null, componentPath: null, target: 'WORK' },
      );

      groupIntents.forEach((intent) => {
        if (intent.kind !== 'BOOK_CHAPTER' && intent.kind !== 'CONTAINED_WORK') return;

        const titles =
          intent.kind === 'CONTAINED_WORK'
            ? (intent.descriptive?.titles ?? [])
            : (builtWork?.chapters.find(({ path }) => path === intent.path)?.titles ??
              resolveOnixDescriptiveComponent(descriptive, intent.productKey, intent.path, choices)?.titles ??
              []);

        settle(
          resolveOnixCollateralComponent(
            collateral,
            intent.productKey,
            intent.path,
            intent.kind === 'BOOK_CHAPTER' ? 'CHAPTER' : 'CONTAINED_WORK',
            {
              choices: collateralChoices,
              canonicalTitleLocale: canonicalLocaleOf(titles),
              describe: `content item ${intent.position} of ${describe(representative(intent.productKey))}`,
            },
          ),
          {
            productKey: intent.productKey,
            componentPath: intent.path,
            target: intent.kind === 'BOOK_CHAPTER' ? 'CHAPTER' : 'CONTAINED_WORK',
          },
        );
      });
    }

    /*
     * Its rights (thoth-app#211), whatever its target: every blocking rights finding of its Products and of the Work
     * stands as a blocker of its own, once, beside anything else that holds the group - an existing Work's licence
     * compatibility stays #184's to decide, and a Work's licence is set only for a new one. The rest stay in the
     * sidecar. Without the rights reduction nothing about a stated right is known, so a group whose source states any
     * cannot be planned; one whose source states none has no licence to set either way.
     */
    if (context.rights === undefined) {
      const asserted = members.flatMap(({ compatibilityAssertions }) =>
        compatibilityAssertions.filter(({ family }) => family === 'LICENCE').flatMap(({ locations }) => locations),
      );

      if (asserted.length > 0) {
        groupBlockers.push(
          blocker(
            'RIGHTS_PREFLIGHT_GAP',
            'PREFLIGHT_GAP',
            { groupKey: group.groupKey },
            asserted.map(({ path }) => path),
            { reason: 'RIGHTS_NOT_REDUCED' },
          ),
        );
      }
    } else {
      // A finding whose omission the publisher may acknowledge (thoth-app#217) waits on that answer, and is lifted by
      // it; every other blocking finding stands until the source changes.
      context.rights.findings
        .filter((finding) => finding.groupKey === group.groupKey && finding.blocking)
        .forEach((finding) => {
          const recordKey = representative(finding.productKey ?? members[0]?.productKey ?? '')?.recordKey;

          if (!isAcknowledgeableRightsFinding(finding)) {
            groupBlockers.push(rightsBlocker(finding, recordKey));
          } else if (acknowledgedRights.has(finding.key)) {
            acknowledgedRightsFindingKeys.push(finding.key);
          } else {
            groupBlockers.push(rightsAcknowledgementBlocker(finding, recordKey));
          }
        });
    }

    /*
     * Its licence action (thoth-app#217): what `Work.license` becomes for this group as the plan executes it, decided
     * from the rights reduction, the existing Work's licence and the acknowledgements above; an existing Work's
     * licence is compared, never written.
     */
    const licence = licenceActionOf(
      group.groupKey,
      target,
      existingWork,
      context.rights,
      acknowledgedRights,
      inputs.rightsChoices,
    );

    groupBlockers.push(...licence.blockers);
    licenceActions.push({ groupKey: group.groupKey, action: licence.action });
    reconciliationFindings.push(...licence.findings);
    licence.findings
      .filter(({ resolution, answer }) => resolution.kind === 'ACKNOWLEDGE' && answer.state === 'ANSWERED')
      .forEach(({ key }) => acknowledgedRightsFindingKeys.push(key));

    /*
     * Its Products' sales rights and contacts (thoth-app#217), for every Product whose Publication this import would
     * still create, as for their commercial facts: a finding that offers an acknowledgement waits on it; a conflict
     * or a gap stands. Without the reduction beside the rights one, nothing about a stated right or contact is known,
     * so the group cannot be planned.
     */
    if (context.rights !== undefined && context.salesRights === undefined) {
      groupBlockers.push(
        blocker('SALES_RIGHTS_PREFLIGHT_GAP', 'PREFLIGHT_GAP', { groupKey: group.groupKey }, [], {
          reason: 'SALES_RIGHTS_NOT_REDUCED',
        }),
      );
    } else if (context.salesRights !== undefined) {
      members.forEach(({ productKey }) => {
        const planned = plannedProducts.get(productKey) as OnixPlannedProduct;
        const state = manifestationOf.get(productKey);

        if (planned.action === 'ALREADY_PRESENT' || planned.action === 'OMIT/EXCLUDED' || state?.kind === 'OMITTED')
          return;

        (context.salesRights as OnixSalesRightsPlan).findings
          .filter((finding) => finding.productKey === productKey && finding.blocking)
          .forEach((finding) => {
            if (finding.resolution.kind === 'ACKNOWLEDGE' && acknowledges(inputs.rightsChoices, finding.key)) {
              acknowledgedRightsFindingKeys.push(finding.key);

              return;
            }

            groupBlockers.push(salesRightsBlocker(finding, representative(productKey)?.recordKey));
          });
      });
    }

    /*
     * Its Publications' accessibility (thoth-app#221): each Product's own, never the Work's (rules 21-22). A Publication
     * this import creates, or finds already in Thoth, waits on every choice its accessibility needs - nothing is taken by
     * source order, version, level or strength - and on every gap; one it creates also waits on the acknowledgement of
     * every material loss. A Product left out creates nothing, so nothing about its features holds the import back; its
     * findings stay in the sidecar.
     */
    if (context.accessibility !== undefined) {
      const accessibility = context.accessibility;

      members.forEach(({ productKey }) => {
        const planned = plannedProducts.get(productKey) as OnixPlannedProduct;
        const state = manifestationOf.get(productKey);
        const reduced = accessibility.products[productKey];

        if (planned.action === 'OMIT/EXCLUDED' || state?.kind === 'OMITTED' || reduced === undefined) return;

        const creates = planned.action !== 'ALREADY_PRESENT';
        const recordKey = representative(productKey)?.recordKey;
        const scope = { recordKey, productKey, groupKey: group.groupKey };
        const findingsOf = (keys: readonly string[]) => keys.flatMap((key) => accessibilityFindingByKey.get(key) ?? []);
        const unanswered = ({ key }: OnixAccessibilityFinding) => accessibilityChoices?.[key] === undefined;

        reduced.findingKeys.forEach((key) => applicableAccessibilityKeys.add(key));
        findingsOf(reduced.findingKeys)
          .filter(({ blocking }) => blocking)
          .forEach((finding) => {
            if (finding.resolution.kind === 'ACKNOWLEDGE') {
              if (creates && unanswered(finding)) {
                groupBlockers.push(
                  accessibilityBlocker('PRODUCT_FORM_FEATURE_ACKNOWLEDGEMENT_REQUIRED', finding, recordKey),
                );
              }
            } else if (finding.resolution.kind === 'NONE') {
              // A gap - or a blocking finding of any other kind, which is never passed through.
              groupBlockers.push(accessibilityBlocker('ACCESSIBILITY_PREFLIGHT_GAP', finding, recordKey));
            }
          });

        // What its accessibility comes to is decided for the one type it becomes, once that type is known.
        if (state?.kind !== 'TYPE') return;

        const publicationType = state.type;
        const decision = resolveOnixPublicationAccessibility(
          accessibility,
          productKey,
          publicationType,
          accessibilityFindingByKey,
          accessibilityChoices,
        );

        if (decision === null) {
          groupBlockers.push(
            blocker('ACCESSIBILITY_PREFLIGHT_GAP', 'PREFLIGHT_GAP', scope, [], {
              reason: 'ACCESSIBILITY_NOT_REDUCED',
              publicationType,
            }),
          );

          return;
        }

        decision.findingKeys.forEach((key) => applicableAccessibilityKeys.add(key));
        decision.gaps
          .filter((key) => !reduced.findingKeys.includes(key))
          .forEach((key) => {
            const finding = accessibilityFindingByKey.get(key);

            groupBlockers.push(
              finding === undefined
                ? blocker('ACCESSIBILITY_PREFLIGHT_GAP', 'PREFLIGHT_GAP', scope, [], {
                    reason: key.endsWith('|UNREPRESENTABLE') ? 'TARGET_STATE_UNREPRESENTABLE' : 'CHOICE_NOT_RAISED',
                    publicationType,
                  })
                : accessibilityBlocker('ACCESSIBILITY_PREFLIGHT_GAP', finding, recordKey),
            );
          });
        findingsOf(decision.pendingChoices).forEach((finding) =>
          groupBlockers.push(accessibilityBlocker('ACCESSIBILITY_CHOICE_REQUIRED', finding, recordKey)),
        );
        // A loss is the import's only where it creates the Publication: one already in Thoth loses nothing to it.
        if (creates) {
          findingsOf(decision.acknowledgements)
            .filter(unanswered)
            .forEach((finding) =>
              groupBlockers.push(accessibilityBlocker('ACCESSIBILITY_ACKNOWLEDGEMENT_REQUIRED', finding, recordKey)),
            );
        }

        const base = {
          productKey,
          groupKey: group.groupKey,
          publicationType,
          resolved: decision.resolved,
          sources: decision.sources,
          omitted: decision.omitted,
        };

        if (planned.action === 'CREATE_PUBLICATION' || planned.action === 'CREATE_PUBLICATION_ON_EXISTING_WORK') {
          accessibilityActions.push({
            ...base,
            action: decision.resolved === null ? { kind: 'BLOCKED' } : { kind: 'CREATE' },
          });

          return;
        }

        if (planned.action !== 'ALREADY_PRESENT' || existingWork === null) return;

        /* The Publication is already in Thoth, and is never updated: its accessibility is compared, not written. */
        const publicationId =
          planned.evidence.flatMap((evidence) =>
            evidence.kind === 'ISBN_MATCH' || evidence.kind === 'THOTH_PUBLICATION_ID' ? [evidence.publicationId] : [],
          )[0] ?? null;
        const existingPublication = existingWork.publications.find(
          (publication) => publication.publicationId === publicationId,
        );

        if (
          publicationId === null ||
          existingPublication === undefined ||
          existingPublication.type !== publicationType
        ) {
          // Silence compares with nothing; a stated fact compared with a Publication that could not be read is a gap.
          if (!reduced.features.some(({ type }) => type === ONIX_ACCESSIBILITY_FEATURE_TYPE)) return;

          groupBlockers.push(
            blocker('ACCESSIBILITY_PREFLIGHT_GAP', 'PREFLIGHT_GAP', scope, [], {
              reason:
                existingPublication === undefined ? 'EXISTING_PUBLICATION_UNREAD' : 'EXISTING_PUBLICATION_TYPE_DIFFERS',
              publicationType,
              ...(publicationId === null ? {} : { publicationId }),
            }),
          );
          accessibilityActions.push({ ...base, action: { kind: 'BLOCKED' } });

          return;
        }

        if (decision.resolved === null) {
          accessibilityActions.push({ ...base, action: { kind: 'BLOCKED' } });

          return;
        }

        const existing = existingPublication.accessibility;
        const outcome = reconcileExistingAccessibility(existingPublication, decision.resolved);
        const locations = [
          ...new Map(
            decision.sources.flatMap(({ locations: stated }) => stated).map((location) => [location.path, location]),
          ).values(),
        ];
        const held = describeAccessibility(existing);
        const stated = describeAccessibility(decision.resolved);
        const reconciliation = (
          code: string,
          classification: OnixPlanFinding['classification'],
          blocking: boolean,
          detail: OnixPlanFinding['detail'],
          message: string,
        ): OnixPlanFinding => {
          const key = ['ACCESSIBILITY', code, productKey, existingPublication.publicationId].join('|');

          return {
            family: 'ACCESSIBILITY_RECONCILIATION',
            key,
            code,
            classification,
            blocking,
            productKey,
            groupKey: group.groupKey,
            locations,
            detail,
            resolution: { kind: 'NONE' },
            answer: accessibilityAnswerOf({ key, resolution: { kind: 'NONE' } }, accessibilityChoices),
            message,
          };
        };
        const publication = `the existing ${publicationType} Publication ${existingPublication.publicationId}`;
        const detail = { publicationId: existingPublication.publicationId, publicationType };

        switch (outcome.kind) {
          case 'EXISTING_PRESERVED':
            if (ACCESSIBILITY_FIELDS.some((field) => existing[field] !== null)) {
              accessibilityReconciliation.push(
                reconciliation(
                  'ACCESSIBILITY_EXISTING_PRESERVED',
                  'SUPPORTED_NORMALIZED',
                  false,
                  detail,
                  `${publication} holds ${held} and the file states none of it; it is kept as it is`,
                ),
              );
            }
            accessibilityActions.push({
              ...base,
              action: { kind: 'EXISTING_PRESERVED', publicationId: existingPublication.publicationId, existing },
            });

            return;
          case 'NOOP':
            accessibilityReconciliation.push(
              reconciliation(
                'ACCESSIBILITY_EXISTING_ALREADY_PRESENT',
                'SUPPORTED_NORMALIZED',
                false,
                detail,
                `${publication} already holds the accessibility the file states (${stated}); nothing is written`,
              ),
            );
            accessibilityActions.push({
              ...base,
              action: { kind: 'NOOP', publicationId: existingPublication.publicationId, existing },
            });

            return;
          case 'ENRICHMENT_DEFERRED': {
            const finding = reconciliation(
              'ACCESSIBILITY_EXISTING_ENRICHMENT_DEFERRED',
              'EXECUTION_DEFERRED',
              true,
              { ...detail, fields: outcome.fields },
              `${publication} leaves its ${outcome.fields.map((field) => ACCESSIBILITY_FIELD_NAMES[field]).join(', ')} empty and the file states ${describeAccessibility(decision.resolved, outcome.fields)}; this import never updates an existing Publication, so filling them is planned but cannot run yet - update the Publication separately`,
            );

            accessibilityReconciliation.push(finding);
            groupBlockers.push(
              blocker(
                'ACCESSIBILITY_EXISTING_ENRICHMENT_DEFERRED',
                'EXECUTION_DEFERRED',
                scope,
                locations.map(({ path }) => path),
                {
                  findingKey: finding.key,
                  finding: finding.code,
                  ...detail,
                  fields: outcome.fields,
                },
              ),
            );
            accessibilityActions.push({
              ...base,
              action: {
                kind: 'ENRICHMENT_DEFERRED',
                publicationId: existingPublication.publicationId,
                existing,
                fields: outcome.fields,
              },
            });

            return;
          }
          case 'CONFLICT': {
            const finding = reconciliation(
              'ACCESSIBILITY_EXISTING_CONFLICT',
              'TARGET_INPUT_REQUIRED',
              true,
              { ...detail, fields: outcome.fields },
              `${publication} holds ${held} and the file states ${stated}; this import never overwrites an existing Publication's accessibility, so it cannot continue as an ordinary import - correct the file, or update the Publication separately`,
            );

            accessibilityReconciliation.push(finding);
            groupBlockers.push(
              blocker(
                'ACCESSIBILITY_EXISTING_CONFLICT',
                'TARGET_INPUT_REQUIRED',
                scope,
                locations.map(({ path }) => path),
                {
                  findingKey: finding.key,
                  finding: finding.code,
                  ...detail,
                  fields: outcome.fields,
                },
              ),
            );
            accessibilityActions.push({
              ...base,
              action: {
                kind: 'CONFLICT',
                publicationId: existingPublication.publicationId,
                existing,
                fields: outcome.fields,
              },
            });
          }
        }
      });
    }

    /*
     * Its Publications' commercial facts (thoth-app#215). Every blocking commercial finding of a Product whose Publication
     * this import would still create stands as a blocker of its own, once: a finding about its prices whatever its type,
     * a finding about its Location only for the carrier its type has. A Product already in Thoth or left out creates no
     * Publication, so nothing about its prices or Locations holds the import back; its findings stay in the sidecar.
     */
    members.forEach(({ productKey, manifestation: decision }) => {
      const planned = plannedProducts.get(productKey) as OnixPlannedProduct;
      const state = manifestationOf.get(productKey);

      if (planned.action === 'ALREADY_PRESENT' || planned.action === 'OMIT/EXCLUDED' || state?.kind === 'OMITTED')
        return;

      const carriers =
        state?.kind === 'TYPE'
          ? [locationCarrierOf(state.type)]
          : decision.kind === 'INPUT_REQUIRED'
            ? [...new Set(decision.candidates.map(locationCarrierOf))]
            : [];
      const carrier = carriers.length === 1 ? carriers[0] : undefined;
      const { supplyLocations } = productByKey.get(productKey) as OnixProductNode;

      // Without the reduction nothing about a stated ProductSupply is known, so a Publication stating one cannot be
      // planned; one stating none has no Price or Location to plan either way.
      if (context.commercial === undefined) {
        if (supplyLocations.length > 0) {
          groupBlockers.push(
            blocker(
              'COMMERCIAL_PREFLIGHT_GAP',
              'PREFLIGHT_GAP',
              { recordKey: representative(productKey)?.recordKey, productKey, groupKey: group.groupKey },
              supplyLocations.map(({ path }) => path),
              { reason: 'COMMERCIAL_NOT_REDUCED' },
            ),
          );
        }

        return;
      }

      // A price decision answered with an amount it offers, or with no Price, no longer holds it back; one answered with
      // anything else holds it back as stale, once, whatever the Product becomes (below). An answer never lifts a finding
      // nothing in the app answers.
      context.commercial.findings
        .filter(
          (finding) =>
            finding.productKey === productKey &&
            finding.blocking &&
            (finding.carrier === null || finding.carrier === carrier) &&
            (finding.resolution.kind === 'NONE' ||
              priceAnswerOf(finding, inputs.commercialChoices).kind === 'UNANSWERED'),
        )
        .forEach((finding) => groupBlockers.push(commercialBlocker(finding, representative(productKey)?.recordKey)));
    });

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

  /*
   * RelatedMaterial (thoth-app#224). Every RelatedWork and RelatedProduct is reconciled into semantic edges between the
   * Works just resolved - exact endpoints only, one edge per pair, contradictions blocked, existing edges satisfied - and
   * every blocking finding waits on its answer, or on the source; a planned edge always waits on #187, which creates it. A
   * new Work's References are its Products' one canonical sequence, and every blocking Reference finding of a Work this
   * import creates holds it; an existing Work's are compared per attaching Product above, and never written. Without the
   * reduction nothing is planned from either, and a new Work whose source states a citation cannot be planned at all.
   */
  const relatedMaterialFindings: OnixRelatedMaterialFinding[] = [];
  const referenceActions: OnixWorkReferenceAction[] = [];
  let relations: ReturnType<typeof resolveOnixRelations> | null = null;

  if (relatedMaterial === undefined) {
    plannedGroups
      .filter(({ target }) => target !== 'EXISTING_WORK')
      .forEach(({ groupKey }) => {
        const asserted = sourcePlan.products
          .filter((node) => node.groupKey === groupKey)
          .flatMap(({ compatibilityAssertions }) =>
            compatibilityAssertions
              .filter(({ family }) => family === 'REFERENCES')
              .flatMap(({ locations }) => locations),
          );

        if (asserted.length > 0) {
          targetBlockers.push(
            blocker(
              'REFERENCE_PREFLIGHT_GAP',
              'PREFLIGHT_GAP',
              { groupKey },
              asserted.map(({ path }) => path),
              { reason: 'REFERENCES_NOT_REDUCED' },
            ),
          );
        }
      });
  } else {
    const recordKeyOf = (finding: OnixRelatedMaterialFinding) =>
      representative(finding.productKey ?? representativeByGroup.get(finding.groupKey) ?? '')?.recordKey;
    const groupStates = new Map<string, OnixRelationGroupState>(
      plannedGroups.map((group) => [
        group.groupKey,
        {
          groupKey: group.groupKey,
          target: group.target,
          existingWorkId: group.existingWorkId,
          existingImprintId: groupTargets.get(group.groupKey)?.existingWork?.imprintId ?? null,
          plannedWorkId: group.plannedWorkId,
          thothProfileActive: profileActiveOf(group.groupKey),
          languageCodes: languageCodesByGroup.get(group.groupKey) ?? null,
          representativeProductKey: representativeByGroup.get(group.groupKey) ?? null,
        },
      ]),
    );

    relations = resolveOnixRelations(relatedMaterial, {
      sourcePlan,
      groups: groupStates,
      evidence: context.relatedMaterialTargets,
      imprintIds,
      choices: relatedMaterialChoices,
    });

    const relationFindingByKey = new Map(relations.findings.map((finding) => [finding.key, finding]));

    relatedMaterialFindings.push(...relations.findings);
    relations.pendingFindingKeys.forEach((key) => {
      const finding = relationFindingByKey.get(key) as OnixRelatedMaterialFinding;

      targetBlockers.push(relatedMaterialBlocker(finding, recordKeyOf(finding)));
    });

    plannedGroups.forEach(({ groupKey, target }) => {
      const members = sourcePlan.products
        .filter((node) => node.groupKey === groupKey)
        .sort((a, b) => (representative(a.productKey)?.index ?? 0) - (representative(b.productKey)?.index ?? 0));
      const reduced = members.flatMap(({ productKey }) => productReferenceResults.get(productKey) ?? []);
      const work = resolveOnixWorkReferences(
        groupKey,
        target,
        reduced.map(({ references }) => references),
        describe(representative(members[0]?.productKey ?? '')),
      );

      referenceActions.push(work.action);
      relatedMaterialFindings.push(...reduced.flatMap(({ findings }) => findings), ...work.findings);

      // An existing Work's References are only ever compared, per attaching Product, above.
      if (target === 'EXISTING_WORK') return;

      [
        ...reduced.flatMap(({ references, findings }) =>
          findings.filter(({ key }) => references.pendingFindingKeys.includes(key)),
        ),
        ...work.findings.filter(({ blocking }) => blocking),
      ].forEach((finding) => targetBlockers.push(relatedMaterialBlocker(finding, recordKeyOf(finding))));
    });
  }

  /*
   * Every relation or Reference answer the reductions do not offer is stale (thoth-app#224): an option a choice does not
   * list, anything but the acknowledgement for a loss, any answer to a finding no answer resolves, or an answer to a finding
   * the plan does not hold - which, bound to the exact declarations, endpoints and citations, is any answer given for a fact
   * that has since changed. None is ignored and none is applied.
   */
  const relatedMaterialFindingByKey = new Map(relatedMaterialFindings.map((finding) => [finding.key, finding]));

  Object.entries(relatedMaterialChoices ?? {}).forEach(([findingKey, answer]) => {
    const finding = relatedMaterialFindingByKey.get(findingKey);

    if (finding !== undefined && isOfferedOnixRelatedMaterialAnswer(finding, answer)) return;

    targetBlockers.push(
      blocker(
        'RELATED_MATERIAL_CHOICE_STALE',
        'TARGET_INPUT_REQUIRED',
        finding === undefined
          ? {}
          : {
              recordKey: representative(finding.productKey ?? representativeByGroup.get(finding.groupKey) ?? '')
                ?.recordKey,
              productKey: finding.productKey ?? undefined,
              groupKey: finding.groupKey,
            },
        finding === undefined ? [] : finding.locations.map(({ path }) => path),
        finding === undefined ? { findingKey, answer } : { findingKey, finding: finding.code, answer },
      ),
    );
  });

  /*
   * Every commercial answer the reduction does not offer is stale (Specification Amendment 2B): an answer naming a source
   * price its decision does not offer, or an answer to a decision this file does not have - which, without a reduction,
   * is every answer. None is ignored, and none falls back to a default: each holds the plan until it is corrected or
   * cleared.
   */
  const commercialFindingByKey =
    context.commercial === undefined ? new Map<string, OnixCommercialFinding>() : findingsByKey(context.commercial);

  Object.entries(inputs.commercialChoices ?? {}).forEach(([findingKey, answer]) => {
    const finding = commercialFindingByKey.get(findingKey);

    if (finding !== undefined && priceAnswerOf(finding, inputs.commercialChoices).kind !== 'STALE') return;

    targetBlockers.push(
      blocker(
        'COMMERCIAL_CHOICE_STALE',
        'TARGET_INPUT_REQUIRED',
        finding === undefined
          ? {}
          : {
              recordKey: representative(finding.productKey)?.recordKey,
              productKey: finding.productKey,
              groupKey: finding.groupKey,
            },
        finding === undefined ? [] : finding.locations.map(({ path }) => path),
        finding === undefined ? { findingKey, answer } : { findingKey, finding: finding.code, answer },
      ),
    );
  });

  /*
   * Every rights or contact answer the reductions do not offer is stale (thoth-app#217): an answer that is not the
   * acknowledgement, an answer to a finding that offers none, or an answer to no finding at all. None is ignored and
   * none is read as consent: each holds the plan until it is corrected or cleared.
   */
  const reconciliationByKey = new Map(reconciliationFindings.map((finding) => [finding.key, finding]));

  Object.entries(inputs.rightsChoices ?? {}).forEach(([findingKey, answer]) => {
    const rightsFinding = rightsFindingByKey.get(findingKey);
    const salesRightsFinding = salesRightsFindingByKey.get(findingKey);
    const reconciliation = reconciliationByKey.get(findingKey);
    const offered =
      (rightsFinding !== undefined && isAcknowledgeableRightsFinding(rightsFinding)) ||
      salesRightsFinding?.resolution.kind === 'ACKNOWLEDGE' ||
      reconciliation?.resolution.kind === 'ACKNOWLEDGE';

    if (offered && answer === ONIX_RIGHTS_ACKNOWLEDGED) return;

    const finding = rightsFinding ?? salesRightsFinding ?? reconciliation;

    targetBlockers.push(
      blocker(
        'RIGHTS_CHOICE_STALE',
        'TARGET_INPUT_REQUIRED',
        finding === undefined
          ? {}
          : {
              recordKey: representative(finding.productKey ?? '')?.recordKey,
              productKey: finding.productKey ?? undefined,
              groupKey: finding.groupKey,
            },
        finding === undefined ? [] : finding.locations.map(({ path }) => path),
        finding === undefined ? { findingKey, answer } : { findingKey, finding: finding.code, answer },
      ),
    );
  });

  /*
   * Every accessibility answer the reduction does not offer is stale (thoth-app#221): an option a choice does not offer,
   * anything but the acknowledgement for a loss, any answer to a finding no answer resolves, or an answer to a finding
   * this file does not have - which, without a reduction, is every answer. None is ignored and none is applied: each
   * holds the plan until it is corrected or cleared.
   */
  const accessibilityReconciliationByKey = new Map(
    accessibilityReconciliation.map((finding) => [finding.key, finding]),
  );

  Object.entries(accessibilityChoices ?? {}).forEach(([findingKey, answer]) => {
    const finding = accessibilityFindingByKey.get(findingKey);

    if (finding !== undefined && isOfferedOnixAccessibilityAnswer(finding, answer)) return;

    const about = finding ?? accessibilityReconciliationByKey.get(findingKey);

    targetBlockers.push(
      blocker(
        'ACCESSIBILITY_CHOICE_STALE',
        'TARGET_INPUT_REQUIRED',
        about === undefined
          ? {}
          : {
              recordKey: representative(about.productKey ?? '')?.recordKey,
              productKey: about.productKey ?? undefined,
              groupKey: about.groupKey,
            },
        about === undefined ? [] : about.locations.map(({ path }) => path),
        about === undefined ? { findingKey, answer } : { findingKey, finding: about.code, answer },
      ),
    );
  });

  /*
   * Every component answer the reductions do not offer is stale (thoth-app#223): an option a choice does not list, an input
   * that is no valid value, anything but the acknowledgement for a loss, any answer to a finding no answer resolves, or an
   * answer to a component fact the plan does not hold - which, bound to everything a ContentItem states, is any answer
   * given for a fact that has since changed. None is ignored and none is applied: each holds the plan until it is
   * corrected or cleared.
   */
  const componentFindingByKey = new Map<string, OnixComponentFinding>(
    [...[...componentPlans].flatMap(({ findings }) => findings), ...raisedComponentFindings].map((finding) => [
      finding.key,
      finding,
    ]),
  );

  Object.entries(componentChoices ?? {}).forEach(([findingKey, answer]) => {
    const finding = componentFindingByKey.get(findingKey);

    if (finding !== undefined && isOfferedOnixComponentAnswer(finding, answer)) return;

    targetBlockers.push(
      blocker(
        'COMPONENT_CHOICE_STALE',
        'TARGET_INPUT_REQUIRED',
        finding === undefined
          ? {}
          : {
              recordKey: representative(finding.productKey)?.recordKey,
              productKey: finding.productKey,
              groupKey: finding.groupKey,
            },
        finding === undefined ? [] : finding.locations.map(({ path }) => path),
        finding === undefined ? { findingKey, answer } : { findingKey, finding: finding.code, answer },
      ),
    );
  });

  /*
   * Every collateral answer the reduction does not offer is stale (thoth-app#225): an option a choice does not list, a
   * locale Thoth does not hold, anything but the acknowledgement for a loss, any answer to a finding no answer resolves, or
   * an answer to a finding the plan does not hold - which, bound to the exact texts and resources it answers, is any answer
   * given for a fact that has since changed. None is ignored and none is applied.
   */
  const collateralFindingByKey = new Map<string, OnixCollateralFinding>([
    ...planCollateralFindingByKey,
    ...raisedCollateralFindings.map((finding): [string, OnixCollateralFinding] => [finding.key, finding]),
  ]);

  Object.entries(collateralChoices).forEach(([findingKey, answer]) => {
    const finding = collateralFindingByKey.get(findingKey);

    if (finding !== undefined && isOfferedOnixCollateralAnswer(finding, answer)) return;

    targetBlockers.push(
      blocker(
        'COLLATERAL_CHOICE_STALE',
        'TARGET_INPUT_REQUIRED',
        finding === undefined
          ? {}
          : {
              recordKey: representative(finding.productKey ?? representativeByGroup.get(finding.groupKey) ?? '')
                ?.recordKey,
              productKey: finding.productKey ?? undefined,
              groupKey: finding.groupKey,
            },
        finding === undefined ? [] : finding.locations.map(({ path }) => path),
        finding === undefined ? { findingKey, answer } : { findingKey, finding: finding.code, answer },
      ),
    );
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

  /*
   * Every finding of every family, once, in one vocabulary (Correction 2 of the #218 review; for thoth-app#186): what
   * it is about, what it offers and how it stands against the inputs. Nothing here decides anything - the blockers
   * above did - and nothing here carries a value the family's own finding does not.
   */
  const blockedFindingKeys = new Set(
    blockers.flatMap(({ detail }) => (typeof detail.findingKey === 'string' ? [detail.findingKey] : [])),
  );
  const descriptiveResolution = (finding: OnixDescriptiveFinding): OnixPlanFinding['resolution'] =>
    finding.resolution.kind === 'CHOICE'
      ? { kind: 'CHOICE', options: finding.resolution.options.map(({ key, label }) => ({ key, label })) }
      : finding.resolution;
  const descriptiveAnswer = (finding: OnixDescriptiveFinding): OnixPlanFinding['answer'] => {
    const value = choices[finding.key];

    if (finding.resolution.kind === 'NONE') return { state: 'NOT_APPLICABLE' };
    if (value === undefined) return { state: 'UNANSWERED' };

    return blockedFindingKeys.has(finding.key) ? { state: 'REJECTED', value } : { state: 'ANSWERED', value };
  };
  const commercialResolution = (finding: OnixCommercialFinding): OnixPlanFinding['resolution'] =>
    finding.resolution.kind === 'NONE'
      ? { kind: 'NONE' }
      : {
          kind: 'CHOICE',
          options: [
            ...finding.resolution.candidates.map(({ key, label }) => ({ key, label })),
            { key: ONIX_PRICE_OMIT, label: ONIX_PRICE_OMIT },
          ],
        };
  const commercialAnswer = (finding: OnixCommercialFinding): OnixPlanFinding['answer'] => {
    const value = inputs.commercialChoices?.[finding.key];
    const answer = priceAnswerOf(finding, inputs.commercialChoices);

    if (answer.kind === 'UNANSWERED') {
      return finding.resolution.kind === 'NONE' ? { state: 'NOT_APPLICABLE' } : { state: 'UNANSWERED' };
    }

    return answer.kind === 'STALE'
      ? { state: 'REJECTED', value: answer.answer }
      : { state: 'ANSWERED', value: value ?? '' };
  };
  const planFindings: OnixPlanFinding[] = [
    ...descriptiveFindings.map(
      (finding): OnixPlanFinding => ({
        family: 'DESCRIPTIVE',
        key: finding.key,
        code: finding.code,
        classification: finding.classification,
        blocking: finding.blocking,
        productKey: finding.productKey,
        groupKey: finding.groupKey,
        locations: finding.locations,
        detail: finding.detail,
        resolution: descriptiveResolution(finding),
        answer: descriptiveAnswer(finding),
        message: finding.message,
      }),
    ),
    ...(context.rights?.findings ?? []).map((finding): OnixPlanFinding => {
      const offered = isAcknowledgeableRightsFinding(finding);

      return {
        family: 'RIGHTS',
        key: finding.key,
        code: finding.code,
        classification: finding.classification,
        blocking: finding.blocking,
        productKey: finding.productKey,
        groupKey: finding.groupKey,
        locations: finding.locations,
        detail: finding.detail,
        resolution: offered ? { kind: 'ACKNOWLEDGE' } : { kind: 'NONE' },
        answer: acknowledgementAnswerOf(inputs.rightsChoices, finding.key, offered),
        message: finding.message,
      };
    }),
    ...reconciliationFindings,
    ...(context.commercial?.findings ?? []).map(
      (finding): OnixPlanFinding => ({
        family: 'COMMERCIAL',
        key: finding.key,
        code: finding.code,
        classification: finding.classification,
        blocking: finding.blocking,
        productKey: finding.productKey,
        groupKey: finding.groupKey,
        locations: finding.locations,
        detail: finding.detail,
        resolution: commercialResolution(finding),
        answer: commercialAnswer(finding),
        message: finding.message,
      }),
    ),
    ...(context.salesRights?.findings ?? []).map(
      (finding): OnixPlanFinding => ({
        family: finding.family,
        key: finding.key,
        code: finding.code,
        classification: finding.classification,
        blocking: finding.blocking,
        productKey: finding.productKey,
        groupKey: finding.groupKey,
        locations: finding.locations,
        detail: finding.detail,
        resolution: finding.resolution,
        answer: acknowledgementAnswerOf(inputs.rightsChoices, finding.key, finding.resolution.kind === 'ACKNOWLEDGE'),
        message: finding.message,
      }),
    ),
    // Every Product's own accessibility and ProductFormFeature findings, and those about the one type each Publication
    // now takes: a finding about a type the plan does not take applies to nothing it plans.
    ...(context.accessibility?.findings ?? [])
      .filter(({ key, publicationType }) => publicationType === null || applicableAccessibilityKeys.has(key))
      .map(
        (finding): OnixPlanFinding => ({
          family: finding.family,
          key: finding.key,
          code: finding.code,
          classification: finding.classification,
          blocking: finding.blocking,
          productKey: finding.productKey,
          groupKey: finding.groupKey,
          locations: finding.locations,
          detail: finding.detail,
          resolution: finding.resolution,
          answer: accessibilityAnswerOf(finding, accessibilityChoices),
          message: finding.message,
        }),
      ),
    ...accessibilityReconciliation,
    // Every component finding of the reduction the plan was given, and those only the answers raised; for a caller that gave
    // none, those of the chapters planned from the adapter's own.
    ...[
      ...(context.components?.findings ?? []),
      ...[...componentPlans]
        .filter((componentPlan) => componentPlan !== context.components)
        .flatMap(({ findings }) => findings.filter(({ key }) => applicableComponentKeys.has(key))),
      ...raisedComponentFindings,
    ]
      .filter((finding, index, all) => all.findIndex(({ key }) => key === finding.key) === index)
      .map((finding): OnixPlanFinding => {
        const value = componentChoices?.[finding.key];

        return {
          family: 'COMPONENT',
          key: finding.key,
          code: finding.code,
          classification: finding.classification,
          blocking: finding.blocking,
          productKey: finding.productKey,
          groupKey: finding.groupKey,
          locations: finding.locations,
          detail: finding.detail,
          resolution: finding.resolution,
          answer:
            value === undefined
              ? finding.resolution.kind === 'NONE'
                ? { state: 'NOT_APPLICABLE' }
                : { state: 'UNANSWERED' }
              : isOfferedOnixComponentAnswer(finding, value)
                ? { state: 'ANSWERED', value }
                : { state: 'REJECTED', value },
          message: finding.message,
        };
      }),
    // Every relation and Reference finding the plan was resolved with (thoth-app#224), answered or not.
    ...[...relatedMaterialFindingByKey.values()].map((finding): OnixPlanFinding => {
      const value = relatedMaterialChoices?.[finding.key];

      return {
        family: finding.family,
        key: finding.key,
        code: finding.code,
        classification: finding.classification,
        blocking: finding.blocking,
        productKey: finding.productKey,
        groupKey: finding.groupKey,
        locations: finding.locations,
        detail: finding.detail,
        resolution: finding.resolution,
        answer:
          value === undefined
            ? finding.resolution.kind === 'NONE'
              ? { state: 'NOT_APPLICABLE' }
              : { state: 'UNANSWERED' }
            : isOfferedOnixRelatedMaterialAnswer(finding, value)
              ? { state: 'ANSWERED', value }
              : { state: 'REJECTED', value },
        message: finding.message,
      };
    }),
    // Every collateral finding of the reduction the plan was given, and those only the answers raised (thoth-app#225).
    ...[...collateralFindingByKey.values()].map((finding): OnixPlanFinding => {
      const value = collateralChoices[finding.key];

      return {
        family: 'COLLATERAL',
        key: finding.key,
        code: finding.code,
        classification: finding.classification,
        blocking: finding.blocking,
        productKey: finding.productKey,
        groupKey: finding.groupKey,
        locations: finding.locations,
        detail: finding.detail,
        resolution: finding.resolution,
        answer:
          value === undefined
            ? finding.resolution.kind === 'NONE'
              ? { state: 'NOT_APPLICABLE' }
              : { state: 'UNANSWERED' }
            : isOfferedOnixCollateralAnswer(finding, value)
              ? { state: 'ANSWERED', value }
              : { state: 'REJECTED', value },
        message: finding.message,
      };
    }),
  ];

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
    ...(context.rights === undefined ? {} : { rights: context.rights, licenceActions }),
    ...(context.commercial === undefined
      ? {}
      : {
          commercial: context.commercial,
          priceResolutions: priceResolutionsOf(products, context.commercial, inputs.commercialChoices),
        }),
    ...(context.salesRights === undefined ? {} : { salesRights: context.salesRights }),
    ...(context.rights === undefined && context.salesRights === undefined ? {} : { acknowledgedRightsFindingKeys }),
    ...(context.accessibility === undefined ? {} : { accessibility: context.accessibility, accessibilityActions }),
    ...(context.components === undefined ? {} : { components: context.components }),
    ...(componentPlans.size === 0 ? {} : { componentIntents }),
    ...(relatedMaterial === undefined || relations === null
      ? {}
      : {
          relatedMaterial: {
            plan: relatedMaterial,
            outcomes: relations.outcomes,
            edges: relations.edges,
            productReferences: [...productReferenceResults.values()].map(({ references }) => references),
            referenceActions,
            referenceCompatibility,
            findings: [...relatedMaterialFindingByKey.values()],
          },
        }),
    ...(context.collateral === undefined
      ? {}
      : {
          collateral: {
            plan: context.collateral,
            actions: collateralActions,
            findings: [
              ...context.collateral.findings.filter(({ key }) => applicableCollateralKeys.has(key)),
              ...raisedCollateralFindings,
            ].filter((finding, index, all) => all.findIndex(({ key }) => key === finding.key) === index),
          },
        }),
    findings: planFindings,
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

/**
 * What building each planned Publication raised, for the Publications actually planned: the adapter's issues, and the
 * canonical commercial reduction's warning that half of a supplier location a digital Publication was given is not
 * imported (thoth-app#215), for that Publication's carrier alone.
 */
const plannedPublicationIssues = (
  sidecar: OnixImportPlanSidecar,
  context: OnixPlanResolutionContext,
): ImportIssue[] => {
  const adaptedByGroup = new Map((context.adaptation ?? []).map((group) => [group.groupKey, group]));
  const recordByKey = new Map(context.sourcePlan.records.map((record) => [record.recordKey, record]));

  return sidecar.products.flatMap(({ productKey, groupKey, action, publicationType, recordKeys }) => {
    if (action !== 'CREATE_PUBLICATION' || publicationType === null) return [];

    const carrier = locationCarrierOf(publicationType);
    const source = recordSource(recordByKey.get(recordKeys[0]));
    const incomplete = (context.commercial?.findings ?? []).filter(
      (finding) =>
        finding.productKey === productKey && finding.code === 'LOCATION_INCOMPLETE' && finding.carrier === carrier,
    );

    return [
      ...(adaptedByGroup.get(groupKey)?.publications[productKey]?.[publicationType]?.issues ?? []),
      ...incomplete.map(
        ({ message }): ImportIssue => ({
          severity: 'warning',
          code: 'onix.location.unrepresentable_canonical',
          message,
          source,
        }),
      ),
    ];
  });
};

/**
 * How each Price of one Product's Publication is decided, as the plan executes it: automatically where the approved
 * reduction takes one amount (rules 27-28), otherwise by the publisher's answer to its price decision. A decision still
 * unanswered decides nothing, and stands as a blocker instead.
 */
const resolvedPricesOf = (
  commercial: OnixCommercialPlan,
  findingByKey: ReadonlyMap<string, OnixCommercialFinding>,
  productKey: string,
  choices: OnixPlanInputs['commercialChoices'],
): OnixResolvedPrice[] =>
  (commercial.products[productKey]?.prices ?? []).flatMap((decision): OnixResolvedPrice[] => {
    const automatic = (unitPrice: number, locations: readonly OnixSourceLocation[]): OnixResolvedPrice => ({
      productKey,
      findingKey: decision.findingKey,
      currencyCode: decision.currencyCode,
      basis: 'AUTOMATIC',
      unitPrice,
      locations,
    });

    if (decision.kind === 'SET') return [automatic(decision.unitPrice, decision.locations)];

    const finding = findingByKey.get(decision.findingKey);
    const answer: PriceAnswer = finding === undefined ? { kind: 'UNANSWERED' } : priceAnswerOf(finding, choices);
    const offered =
      decision.kind === 'DEFAULT_WITH_ALTERNATIVES'
        ? [...decision.locations, ...decision.alternatives.map(({ path, sourcePath }) => ({ path, sourcePath }))]
        : decision.locations;

    switch (answer.kind) {
      case 'UNANSWERED':
        // An optional decision keeps its default; a required one decides nothing yet, and stands as a blocker.
        return decision.kind === 'DEFAULT_WITH_ALTERNATIVES' ? [automatic(decision.unitPrice, decision.locations)] : [];
      case 'OMIT':
        return [
          {
            productKey,
            findingKey: decision.findingKey,
            currencyCode: decision.currencyCode,
            basis: 'PUBLISHER_OMISSION',
            unitPrice: null,
            locations: offered,
          },
        ];
      case 'CANDIDATE':
        return [
          {
            productKey,
            findingKey: decision.findingKey,
            currencyCode: answer.candidate.currencyCode,
            basis: 'PUBLISHER_CHOICE',
            unitPrice: answer.candidate.unitPrice,
            locations: [{ path: answer.candidate.path, sourcePath: answer.candidate.sourcePath }],
          },
        ];
      default:
        // A stale answer decides nothing: no default stands in for it, and the plan waits on its blocker.
        return [];
    }
  });

/** A commercial reduction's findings by key, built once for a plan. */
const findingsByKey = (commercial: OnixCommercialPlan): ReadonlyMap<string, OnixCommercialFinding> =>
  new Map(commercial.findings.map((finding) => [finding.key, finding]));

/** How every Price of every Publication the plan creates was decided, in Product order. */
const priceResolutionsOf = (
  products: readonly OnixPlannedProduct[],
  commercial: OnixCommercialPlan,
  choices: OnixPlanInputs['commercialChoices'],
): OnixResolvedPrice[] => {
  const findingByKey = findingsByKey(commercial);

  return products
    .filter(({ action, publicationType }) => action === 'CREATE_PUBLICATION' && publicationType !== null)
    .flatMap(({ productKey }) => resolvedPricesOf(commercial, findingByKey, productKey, choices));
};

/**
 * The Prices and Location one planned Publication is created with: exactly what the canonical commercial reduction takes
 * for its Product and its type's carrier (thoth-app#215), and nothing the adapted candidate carries.
 */
const commercialTargetsOf = (
  commercial:
    | { readonly plan: OnixCommercialPlan; readonly findingByKey: ReadonlyMap<string, OnixCommercialFinding> }
    | undefined,
  productKey: string,
  publicationType: PublicationType,
  choices: OnixPlanInputs['commercialChoices'],
): Pick<PublicationEntity, 'prices' | 'locations'> => {
  const product = commercial?.plan.products[productKey];
  const location = product?.carriers[locationCarrierOf(publicationType)]?.location;

  return {
    prices: (commercial === undefined
      ? []
      : resolvedPricesOf(commercial.plan, commercial.findingByKey, productKey, choices)
    ).flatMap(({ currencyCode, unitPrice }): PriceEntity[] =>
      currencyCode === null || unitPrice === null
        ? []
        : [{ id: appConfig.defaultId, currencyCode: currencyCode as PriceEntity['currencyCode'], unitPrice }],
    ),
    locations:
      location?.kind === 'CANONICAL'
        ? [
            {
              id: appConfig.defaultId,
              canonical: true,
              landingPage: location.candidate.landingPage,
              fullTextUrl: location.candidate.fullTextUrl,
              locationPlatform: location.candidate.platform,
            } satisfies LocationEntity,
          ]
        : [],
  };
};

/**
 * The accessibility fields one planned Publication is created with (thoth-app#221): exactly the four values the plan
 * resolved for it, and nothing the adapted candidate carries. Without a reduction, what the candidate carries - none.
 * An executable plan always resolves a Publication's accessibility, into a state the database holds; anything else is a
 * defect, never a Publication.
 */
const accessibilityTargetsOf = (
  sidecar: OnixImportPlanSidecar,
  productKey: string,
  publicationType: PublicationType,
): Partial<
  Pick<
    PublicationEntity,
    'accessibilityStandard' | 'accessibilityAdditionalStandard' | 'accessibilityException' | 'accessibilityReportUrl'
  >
> => {
  if (sidecar.accessibility === undefined) return {};

  const planned = sidecar.accessibilityActions?.find((action) => action.productKey === productKey);
  const resolved = planned?.resolved ?? null;

  if (
    planned === undefined ||
    planned.action.kind !== 'CREATE' ||
    planned.publicationType !== publicationType ||
    resolved === null ||
    !isRepresentableOnixAccessibility(publicationType, resolved)
  ) {
    throw new Error(`ONIX plan Product ${productKey} is executable but its accessibility is not resolved`);
  }

  return {
    accessibilityStandard: resolved.accessibilityStandard,
    accessibilityAdditionalStandard: resolved.accessibilityAdditionalStandard,
    accessibilityException: resolved.accessibilityException,
    accessibilityReportUrl: resolved.accessibilityReportUrl ?? '',
  };
};

/**
 * The abstracts, table of contents and general note one planned Work, chapter or contained Work is created with, from the
 * collateral the plan resolved for it (thoth-app#225). Without a collateral reduction nothing is: no abstract, no table of
 * contents and no note. An executable plan always has its collateral planned, and never an AdditionalResource - which waits
 * on #187 - so anything else is a defect, never a Work.
 */
const collateralOf = (
  sidecar: OnixImportPlanSidecar,
  groupKey: string,
  productKey: string | null,
  componentPath: string | null,
): Pick<WorkEntity, 'abstracts' | 'generalNote' | 'toc'> => {
  if (sidecar.collateral === undefined) return { abstracts: [], toc: undefined, generalNote: '' };

  const planned = sidecar.collateral.actions.find(
    (action) =>
      action.groupKey === groupKey && action.productKey === productKey && action.componentPath === componentPath,
  );

  if (planned === undefined || planned.action !== 'PLANNED' || planned.resources.length > 0) {
    throw new Error(`ONIX plan ${componentPath ?? groupKey} is executable but its collateral is not planned`);
  }

  return {
    abstracts: planned.abstracts.map(
      (row): AbstractEntity => ({
        id: appConfig.defaultId,
        type: row.type,
        canonical: row.canonical,
        content: row.content,
        localeCode: row.localeCode as AbstractEntity['localeCode'],
        sourceMarkupFormat: row.markupFormat,
      }),
    ),
    toc: planned.tableOfContents?.content,
    generalNote: planned.generalNote?.content ?? '',
  };
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

  const commercial =
    context.commercial === undefined
      ? undefined
      : { plan: context.commercial, findingByKey: findingsByKey(context.commercial) };

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
      // The licence is the plan's licence action for the grouped Work, and only a supported one is ever sent
      // (5568901904 rules 116-118, 137-138): an acknowledged omission sends none, as does a Work stating no rights.
      const licence = sidecar.licenceActions?.find(({ groupKey }) => groupKey === group.groupKey)?.action ?? {
        kind: 'UNSET',
      };

      if (licence.kind === 'BLOCKED') {
        throw new Error(`ONIX plan group ${group.groupKey} is executable but its licence is blocked`);
      }

      const publications: PublicationEntity[] = sidecar.products
        .filter(({ groupKey, action }) => groupKey === group.groupKey && action === 'CREATE_PUBLICATION')
        .sort((a, b) => (productOrder.get(a.productKey) ?? 0) - (productOrder.get(b.productKey) ?? 0))
        .map(({ productKey, publicationType }) => {
          const planned = adapted.publications[productKey]?.[publicationType as PublicationType];

          if (planned === undefined) {
            throw new Error(`ONIX plan Product ${productKey} has no adapted ${publicationType} Publication`);
          }

          return {
            ...planned.publication,
            ...commercialTargetsOf(
              commercial,
              productKey,
              publicationType as PublicationType,
              context.inputs.commercialChoices,
            ),
            ...accessibilityTargetsOf(sidecar, productKey, publicationType as PublicationType),
          };
        });

      // A new Work's References are its Products' one canonical sequence (thoth-app#224), never the candidate's.
      const references = sidecar.relatedMaterial?.referenceActions.find(({ groupKey }) => groupKey === group.groupKey)
        ?.action ?? { kind: 'NONE' as const };

      if (references.kind === 'BLOCKED' || references.kind === 'EXISTING_WORK_NOT_UPDATED') {
        throw new Error(`ONIX plan group ${group.groupKey} is executable but its References are not resolved`);
      }

      // A new Work's collateral is its canonical collateral reduction's (thoth-app#225), never the candidate's. An executable
      // plan never holds an AdditionalResource: every one waits on #187, which alone can create it.
      const collateral = collateralOf(sidecar, group.groupKey, null, null);

      builtByWorkId.set(candidate.id, built);

      return {
        ...candidate,
        type: group.workType.type,
        edition: group.edition.edition,
        doi: group.workDoi.kind === 'DOI' ? group.workDoi.doi : '',
        lccn: profileFields?.lccn ?? '',
        oclc: profileFields?.oclc ?? '',
        reference: profileFields?.reference ?? '',
        license: licence.kind === 'SET_SUPPORTED_LICENSE' ? licence.url : '',
        titles: values.titles,
        languages: values.languages,
        subjects: values.subjects,
        status: values.status,
        publicationDate: values.publicationDate,
        withdrawnDate: values.withdrawnDate,
        copyrightHolder: values.copyrightHolder,
        landingPage: values.landingPage,
        // The one front cover the descriptive reduction plans (thoth-app#219), never the candidate's, with that cover's
        // caption (thoth-app#225); with none planned the Work states none, as a new Work entity does.
        coverUrl: values.coverUrl ?? undefined,
        coverCaption: values.coverCaption ?? undefined,
        abstracts: collateral.abstracts,
        toc: collateral.toc,
        generalNote: collateral.generalNote,
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
        references:
          references.kind === 'CREATE'
            ? references.references.map(
                (reference): ReferenceEntity => ({
                  id: appConfig.defaultId,
                  doi: reference.doi ?? '',
                  unstructuredCitation: reference.unstructuredCitation ?? '',
                  isbn: reference.isbn ?? '',
                  issn: reference.issn ?? '',
                  journalTitle: '',
                  articleTitle: '',
                  seriesTitle: '',
                  volumeTitle: '',
                  url: '',
                  orderNumber: reference.referenceOrdinal,
                }),
              )
            : [],
      };
    });

  const workById = new Map(works.map((work) => [work.id, work]));

  /*
   * The normalised non-chapter relation graph (thoth-app#224): every edge Thoth already holds, and every one the import
   * would create - which never reaches an executable plan while its creation waits on #187 - by stable Work id, never by a
   * copy of a Work. Nothing here is executed: the current executor creates no ordinary Work relation.
   */
  const relations = (sidecar.relatedMaterial?.edges ?? []).flatMap((edge): ImportRelationEdge[] => {
    if (edge.state !== 'PLANNED' && edge.state !== 'SATISFIED') return [];

    const relator = importEndpointOf(edge.relator);
    const related = importEndpointOf(edge.related);
    const planned = [relator, related].every(
      (endpoint) => endpoint !== null && (endpoint.kind === 'EXISTING_WORK' || workById.has(endpoint.workId)),
    );

    if (relator === null || related === null || !planned) {
      throw new Error(`ONIX plan relation ${edge.edgeKey} names a Work the plan does not hold`);
    }

    return [
      {
        key: edge.edgeKey,
        relator,
        related,
        relationType: edge.relationType,
        relationOrdinal: edge.ordinal.status === 'UNASSIGNED' ? null : edge.ordinal.ordinal,
        status: edge.state,
      },
    ];
  });
  const candidateChapterById = new Map(candidatePlan.chapters.map((chapter) => [chapter.id, chapter]));
  const plannedChapters = (sidecar.componentIntents ?? []).filter(
    (intent): intent is OnixChapterIntent =>
      intent.kind === 'BOOK_CHAPTER' &&
      intent.parent.plannedWorkId !== null &&
      workById.has(intent.parent.plannedWorkId),
  );
  const plannedChapterIds = new Set(plannedChapters.map(({ chapterWorkId }) => chapterWorkId));

  // Every candidate chapter of a Work the plan creates is one the component reduction planned: never one it did not.
  candidatePlan.chapters.forEach(({ id, relationId }) => {
    if (relationId !== null && workById.has(relationId) && !plannedChapterIds.has(id)) {
      throw new Error(`ONIX plan chapter ${id} has no planned component`);
    }
  });

  return {
    works,
    /*
     * A chapter is its planned component (thoth-app#223): at the ordinal the plan resolved - the source's flat
     * LevelSequenceNumber or the publisher's, never its place in the file - with the page range, page count and DOI the
     * canonical reduction took. The chapters stay in the file's order, as every ImportPlan's do, and are never sorted by
     * those ordinals: the executor creates a Work's chapters at positions 1 to N in that order, so a chapter is executable
     * only where its ordinal is exactly its place there, which the component reduction defers otherwise (#187). Its titles,
     * contributors, languages and subjects are its own ContentItem's descriptive reduction, and its imprint and lifecycle
     * its Work's, as the approved normalisation (5541336717 rule 14); Thoth holds no edition for it. It never inherits its
     * Work's licence (5568901904 rules 102, 108), and its own ContentItem licence is not reduced at this stage.
     */
    chapters: works.flatMap((work) =>
      plannedChapters
        .filter(({ parent }) => parent.plannedWorkId === work.id)
        .map((intent, index) => {
          const chapter = intent.chapterWorkId === null ? undefined : candidateChapterById.get(intent.chapterWorkId);
          const built = builtByWorkId.get(work.id)?.chapters.find(({ workId }) => workId === intent.chapterWorkId);

          if (intent.action !== 'CREATE_CHAPTER' || intent.ordinal.status !== 'RESOLVED' || chapter === undefined) {
            throw new Error(`ONIX plan chapter ${intent.componentKey} is executable but not resolved`);
          }

          if (intent.ordinal.ordinal !== index + 1) {
            throw new Error(
              `ONIX plan chapter ${intent.componentKey} is executable at position ${intent.ordinal.ordinal} but would be created at ${index + 1}`,
            );
          }

          if (built === undefined) throw new Error(`ONIX plan chapter ${chapter.id} has no descriptive chapter`);

          // Its own ContentItem's abstracts and note (thoth-app#225): never its Work's, and never a table of contents.
          const collateral = collateralOf(sidecar, intent.groupKey, intent.productKey, intent.path);

          return {
            ...chapter,
            imprintId: work.imprintId,
            relationId: work.id,
            doi: intent.doi ?? '',
            pageCount: intent.pageCount ?? 0,
            firstPage: intent.pages.status === 'RESOLVED' ? intent.pages.firstPage : '',
            lastPage: intent.pages.status === 'RESOLVED' ? intent.pages.lastPage : '',
            edition: work.edition,
            status: work.status,
            publicationDate: work.publicationDate,
            withdrawnDate: work.withdrawnDate,
            copyrightHolder: work.copyrightHolder,
            license: '',
            titles: built.titles,
            languages: built.languages,
            subjects: built.subjects,
            contributions: built.contributions,
            abstracts: collateral.abstracts,
            generalNote: collateral.generalNote,
          };
        }),
    ),
    series: series
      .map((group) => ({ ...group, members: group.members.filter(({ workId }) => workById.has(workId)) }))
      .filter(({ members }) => members.length > 0),
    ...(sidecar.relatedMaterial === undefined ? {} : { relations }),
    onix: sidecar,
  };
};
