import type { PublicationType } from '@/src/entities/publication/model/publication.types';
import type { WorkId, WorkType } from '@/src/entities/work/model/work.types';
import type { OnixDescriptivePlan } from '@/src/shared/parsers/XMLParser/onixDescriptive';
import {
  ONIX_EXCLUDABLE_DISPOSITIONS,
  ONIX_WORK_OVERRIDE_TYPES,
} from '@/src/shared/parsers/XMLParser/onixTargetResolution';
import {
  type ImportPlan,
  ONIX_MANIFESTATION_OMIT,
  ONIX_PRICE_OMIT,
  type OnixImportPlanSidecar,
  type OnixLocaleSuggestion,
  type OnixManifestationChoice,
  type OnixPlanBlocker,
  type OnixPlanBlockerClassification,
  type OnixPlanBlockerCode,
  type OnixPlanFinding,
  type OnixPlanFindingFamily,
  type OnixPlanInputs,
  type OnixPlannedProduct,
  type OnixPlannedRecord,
  type OnixPlannedWorkGroup,
  type OnixProductTargetAction,
  type OnixResolvedPrice,
  type OnixSourceLocation,
  type OnixTargetEvidence,
  type OnixWorkLicenceAction,
  type OnixWorkTargetAction,
} from '@/src/shared/types';
import { getDisplayTitle } from '@/src/shared/utils/work';

/*
 * The publisher review of one resolved ONIX Import Plan (thoth-app#262; #179 6036599101 G-K).
 *
 * This module is a pure presentation projection. It reads the exact resolved sidecar Stage A (thoth-app#261) produced -
 * its Work groups, Products, structured findings with their canonical resolution and answer, blockers, price
 * resolutions and licence actions - and arranges them into what a publisher reviews: one Work at a time, with its
 * resolved facts, the decisions still theirs to take, and the problems only the file can resolve. It never runs a
 * reduction, chooses between source values, infers a target value or reads a planner message for meaning: which
 * decisions exist, whether anything blocks and which answers stand are the sidecar's alone. The read-only presentation
 * context it may be given - the canonical descriptive plan, the candidate plan, the exact existing targets - supplies
 * display labels and already-decided facts only, and can change no task, state or count.
 */

export type OnixReviewFilter = 'ATTENTION' | 'READY' | 'ALL';

export type OnixReviewWorkState = 'NEEDS_CONFIRMATION' | 'BLOCKED' | 'READY';

/**
 * How a task stands against the canonical inputs: waiting for the publisher, answered with a value the plan took, or
 * answered with a value the plan refused - stale or invalid - which holds the plan until it is corrected or cleared.
 */
export type OnixReviewTaskState = 'PENDING' | 'RESOLVED' | 'REJECTED';

/** The evidence a task or problem rests on: for technical details only, never for the primary copy. */
export type OnixReviewEvidence = {
  readonly code: string;
  readonly classification: string | null;
  /** The canonical finding the evidence belongs to, where there is one. */
  readonly findingKey: string | null;
  readonly locations: readonly OnixSourceLocation[];
  readonly detail: Readonly<Record<string, string | number | readonly string[]>>;
  /** The planner's own English, diagnostic only. */
  readonly message: string | null;
};

export type OnixReviewOption = { readonly key: string; readonly label: string };

export type OnixReviewPriceCandidate = {
  readonly key: string;
  readonly currencyCode: string;
  /** The PriceAmount exactly as the file states it. */
  readonly amount: string;
  readonly unitPrice: number;
};

/** What a task asks, in structure: the control that answers it is chosen from this, never from the planner's prose. */
export type OnixReviewControl =
  | { readonly kind: 'WORK_TYPE'; readonly suggestion: WorkType | null; readonly options: readonly WorkType[] }
  | { readonly kind: 'EDITION' }
  | {
      readonly kind: 'MANIFESTATION';
      /** The types the file allows the publisher to choose between; empty where only an omission is offered. */
      readonly candidates: readonly PublicationType[];
      /** The type the file resolves, where the only decision is whether to create the Publication at all. */
      readonly resolvedType: PublicationType | null;
      readonly omitOffered: boolean;
    }
  | { readonly kind: 'LOCALE'; readonly suggestion: OnixLocaleSuggestion | null }
  | { readonly kind: 'DATE' }
  | { readonly kind: 'TEXT' }
  | { readonly kind: 'ORDINAL' }
  | {
      readonly kind: 'INSTITUTION';
      /** The name-search suggestions, none of them chosen. */
      readonly options: readonly OnixReviewOption[];
      readonly omitOption: OnixReviewOption | null;
    }
  | {
      readonly kind: 'PRICE';
      readonly currencyCode: string | null;
      readonly candidates: readonly OnixReviewPriceCandidate[];
      readonly omitOffered: boolean;
    }
  | { readonly kind: 'CHOICE'; readonly options: readonly OnixReviewOption[] }
  | { readonly kind: 'ACKNOWLEDGE' }
  /** A yes-or-no the publisher gives: `'true'` or nothing. */
  | { readonly kind: 'CONFIRM' }
  /** An answer to a finding this file does not have, which can only be cleared. */
  | { readonly kind: 'CLEAR' };

export type OnixReviewScope =
  | { readonly kind: 'FILE' }
  | { readonly kind: 'WORK' }
  | { readonly kind: 'PRODUCT'; readonly productKey: string; readonly label: string }
  | { readonly kind: 'COMPONENT'; readonly productKey: string; readonly position: string; readonly label: string }
  | { readonly kind: 'RECORD'; readonly recordKey: string; readonly label: string };

type RecordInputField =
  | 'workTypeOverrides'
  | 'manifestationChoices'
  | 'editionInputs'
  | 'descriptiveChoices'
  | 'commercialChoices'
  | 'rightsChoices'
  | 'accessibilityChoices'
  | 'componentChoices'
  | 'relatedMaterialChoices'
  | 'collateralChoices'
  | 'reviewsPrizesChoices';

/** The canonical input a task's answer is written to: the plan is resolved again from it, and from nothing else. */
export type OnixReviewInputBinding =
  | { readonly field: RecordInputField; readonly key: string }
  | { readonly field: 'excludedRecordKeys'; readonly key: string }
  | { readonly field: 'thothCompatibilityConfirmed' };

export type OnixReviewTaskFamily = OnixPlanFindingFamily | 'WORK' | 'PRODUCT' | 'RECORD' | 'FILE';

export type OnixReviewTask = {
  /** Stable across resolutions: the canonical finding key, or the group, Product or record key the task is about. */
  readonly key: string;
  readonly family: OnixReviewTaskFamily;
  readonly code: string;
  readonly groupKey: string | null;
  readonly scope: OnixReviewScope;
  /** What the task is about, where canonical state names it: a contributor, an affiliation, a funder. */
  readonly subject: string | null;
  /** The descriptive family a descriptive finding belongs to (titles, contributors, series...); null elsewhere. */
  readonly topic: string | null;
  /** Whether the plan waits on it. An optional task adjusts an outcome the plan already has. */
  readonly required: boolean;
  readonly state: OnixReviewTaskState;
  /** The answer the inputs currently hold, as given. */
  readonly answer: string | undefined;
  readonly control: OnixReviewControl;
  readonly input: OnixReviewInputBinding;
  readonly evidence: OnixReviewEvidence;
};

/** A blocker no control of the review answers: the file, or Thoth, has to change. */
export type OnixReviewProblem = {
  readonly key: string;
  readonly code: OnixPlanBlockerCode;
  readonly classification: OnixPlanBlockerClassification;
  readonly groupKey: string | null;
  readonly scope: OnixReviewScope;
  readonly evidence: OnixReviewEvidence;
};

export type OnixReviewPrice = {
  readonly currencyCode: string | null;
  readonly unitPrice: number | null;
  readonly basis: OnixResolvedPrice['basis'];
  /** The price task the publisher decided it by, where one exists. */
  readonly taskKey: string | null;
};

export type OnixReviewPublication = {
  readonly productKey: string;
  /** The record reference(s) the Product was stated in. */
  readonly label: string;
  readonly isbn: string | null;
  readonly type: PublicationType | null;
  readonly action: OnixProductTargetAction | 'NEEDS_INPUT' | 'BLOCKED';
  readonly prices: readonly OnixReviewPrice[];
  /** The manifestation task the Publication's type or omission is decided by, where one exists. */
  readonly manifestationTaskKey: string | null;
};

export type OnixReviewWork = {
  readonly groupKey: string;
  /** 1-based position among the file's Works, for a neutral label where no title is known. */
  readonly position: number;
  readonly title: string | null;
  readonly target: OnixWorkTargetAction | null;
  readonly existingWorkId: WorkId | null;
  readonly workType: WorkType | null;
  readonly workTypeTaskKey: string | null;
  readonly edition: number | null;
  readonly editionTaskKey: string | null;
  readonly licence: OnixWorkLicenceAction['action'] | null;
  readonly cover: 'FOUND' | 'NONE' | null;
  readonly publications: readonly OnixReviewPublication[];
  /** Every task of the Work, whatever its state: pending and rejected ones need the publisher; resolved ones can be edited. */
  readonly tasks: readonly OnixReviewTask[];
  readonly problems: readonly OnixReviewProblem[];
  readonly state: OnixReviewWorkState;
  readonly requiredConfirmations: number;
};

export type OnixReviewAutomaticItem = {
  readonly kind: 'GROUPED' | 'FORMATS' | 'COVERS' | 'PRICES' | 'LICENCES' | 'EXISTING';
  readonly count: number;
};

export type OnixImportReviewModel = {
  readonly works: readonly OnixReviewWork[];
  readonly totals: {
    readonly works: number;
    readonly publications: number;
    readonly requiredConfirmations: number;
    readonly worksNeedingAttention: number;
    readonly problems: number;
  };
  /** Decisions that belong to the file rather than to one Work: record exclusions, the Thoth compatibility confirmation. */
  readonly fileTasks: readonly OnixReviewTask[];
  readonly fileProblems: readonly OnixReviewProblem[];
  readonly automatic: readonly OnixReviewAutomaticItem[];
  readonly executable: boolean;
  /** Whether an executable plan does anything: creates a Work, attaches a Publication, creates a relation. */
  readonly createsSomething: boolean;
  readonly compatibility: OnixImportPlanSidecar['compatibility']['activation'];
  readonly defaultFilter: OnixReviewFilter;
};

/** Read-only display context from the same planning run (thoth-app#262 plan, "Presentation context"). */
export type OnixReviewPresentationContext = {
  /** The canonical descriptive plan: for the one resolved cover, and for the names of the contributors tasks are about. */
  readonly descriptive?: OnixDescriptivePlan;
  /** The candidate plan: for the exact title of a new Work, by its `plannedWorkId`. */
  readonly candidatePlan?: ImportPlan;
  /** The exact existing targets: for the title of an existing Work, by its `existingWorkId`. */
  readonly targets?: OnixTargetEvidence;
};

/* ------------------------------------------------------------------------------------------------ */
/* Task and problem helpers                                                                          */
/* ------------------------------------------------------------------------------------------------ */

/** The tasks the publisher still has to act on: required, and waiting or refused. */
export const pendingReviewTasks = (tasks: readonly OnixReviewTask[]): OnixReviewTask[] =>
  tasks.filter(({ required, state }) => required && state !== 'RESOLVED');

/** The Works one filter shows. Filtering happens here, before any card is rendered. */
export const filterReviewWorks = (works: readonly OnixReviewWork[], filter: OnixReviewFilter): OnixReviewWork[] => {
  switch (filter) {
    case 'ATTENTION':
      return works.filter(({ state }) => state !== 'READY');
    case 'READY':
      return works.filter(({ state }) => state === 'READY');
    case 'ALL':
      return [...works];
  }
};

/** A record without one of its keys, so that taking a decision back leaves no trace of it. */
const without = <T>(decisions: Readonly<Record<string, T>> | undefined, key: string): Record<string, T> =>
  Object.fromEntries(Object.entries(decisions ?? {}).filter(([decided]) => decided !== key));

/**
 * The publisher's next inputs once a task is answered - or cleared, with `undefined`. Pure wiring to the canonical
 * input the task is bound to; the resolver decides what the answer means.
 */
export const answerReviewTask = (
  inputs: OnixPlanInputs,
  task: Pick<OnixReviewTask, 'input'>,
  value: string | undefined,
): OnixPlanInputs => {
  const { input } = task;

  switch (input.field) {
    case 'thothCompatibilityConfirmed':
      return { ...inputs, thothCompatibilityConfirmed: value !== undefined };
    case 'excludedRecordKeys':
      return {
        ...inputs,
        excludedRecordKeys:
          value === undefined
            ? inputs.excludedRecordKeys.filter((recordKey) => recordKey !== input.key)
            : [...new Set([...inputs.excludedRecordKeys, input.key])].sort(),
      };
    case 'editionInputs':
      return {
        ...inputs,
        editionInputs:
          value === undefined
            ? without(inputs.editionInputs, input.key)
            : { ...inputs.editionInputs, [input.key]: Number(value) },
      };
    case 'workTypeOverrides':
      return {
        ...inputs,
        workTypeOverrides:
          value === undefined
            ? without(inputs.workTypeOverrides, input.key)
            : { ...inputs.workTypeOverrides, [input.key]: value as WorkType },
      };
    case 'manifestationChoices':
      return {
        ...inputs,
        manifestationChoices:
          value === undefined
            ? without(inputs.manifestationChoices, input.key)
            : { ...inputs.manifestationChoices, [input.key]: value as OnixManifestationChoice },
      };
    default:
      return {
        ...inputs,
        [input.field]:
          value === undefined
            ? without(inputs[input.field], input.key)
            : { ...inputs[input.field], [input.key]: value },
      };
  }
};

/* ------------------------------------------------------------------------------------------------ */
/* Projection                                                                                        */
/* ------------------------------------------------------------------------------------------------ */

/** The input each finding family's answers are written to (`OnixPlanInputs`). */
const INPUT_FIELD_OF_FAMILY: Readonly<Record<OnixPlanFindingFamily, RecordInputField>> = {
  DESCRIPTIVE: 'descriptiveChoices',
  RIGHTS: 'rightsChoices',
  COMMERCIAL: 'commercialChoices',
  SALES_RIGHTS: 'rightsChoices',
  PRODUCT_CONTACT: 'rightsChoices',
  LICENCE_RECONCILIATION: 'rightsChoices',
  ACCESSIBILITY: 'accessibilityChoices',
  PRODUCT_FORM_FEATURE: 'accessibilityChoices',
  ACCESSIBILITY_RECONCILIATION: 'accessibilityChoices',
  COMPONENT: 'componentChoices',
  RELATION: 'relatedMaterialChoices',
  REFERENCE: 'relatedMaterialChoices',
  COLLATERAL: 'collateralChoices',
  REVIEWS_PRIZES: 'reviewsPrizesChoices',
};

/** The input a stale-answer blocker names, by its code. */
const INPUT_FIELD_OF_STALE_BLOCKER: Readonly<Partial<Record<OnixPlanBlockerCode, RecordInputField>>> = {
  COMMERCIAL_CHOICE_STALE: 'commercialChoices',
  RIGHTS_CHOICE_STALE: 'rightsChoices',
  ACCESSIBILITY_CHOICE_STALE: 'accessibilityChoices',
  COMPONENT_CHOICE_STALE: 'componentChoices',
  RELATED_MATERIAL_CHOICE_STALE: 'relatedMaterialChoices',
  COLLATERAL_CHOICE_STALE: 'collateralChoices',
  REVIEWS_PRIZES_CHOICE_STALE: 'reviewsPrizesChoices',
};

/**
 * The descriptive decisions that choose an existing Thoth institution: their options are name-search suggestions and
 * one omission (5562159621 rules 116-117, 5542084141 rule 72). A presentation grouping of codes, deciding nothing.
 */
const INSTITUTION_CODES: ReadonlySet<string> = new Set([
  'CONTRIBUTOR_AFFILIATION_UNIDENTIFIED',
  'CONTRIBUTOR_AFFILIATION_UNRESOLVED',
  'FUNDING_FUNDER_UNIDENTIFIED',
  'FUNDING_FUNDER_UNRESOLVED',
]);

/** Blockers the review's own non-finding tasks answer, when such a task exists for what they name. */
const WORK_TYPE_BLOCKERS: ReadonlySet<OnixPlanBlockerCode> = new Set(['WORK_TYPE_INPUT_REQUIRED']);
const EDITION_BLOCKERS: ReadonlySet<OnixPlanBlockerCode> = new Set(['EDITION_INPUT_REQUIRED']);
const MANIFESTATION_BLOCKERS: ReadonlySet<OnixPlanBlockerCode> = new Set([
  'MANIFESTATION_INPUT_REQUIRED',
  'MANIFESTATION_ACKNOWLEDGEMENT_REQUIRED',
]);
const RECORD_BLOCKERS: ReadonlySet<OnixPlanBlockerCode> = new Set(['RECORD_NOT_COMPLETE', 'RECORD_SEQUENCE_AMBIGUITY']);

/** Classifications no publisher decision answers: a Product waiting on one is blocked, not waiting for input. */
const PROBLEM_CLASSIFICATIONS: ReadonlySet<OnixPlanBlockerClassification> = new Set([
  'SOURCE_INVALID',
  'SOURCE_CONFLICT',
  'TARGET_UNREPRESENTABLE',
  'PREFLIGHT_GAP',
  'EXECUTION_DEFERRED',
]);

/** The findings a blocker waits on: its own, or those an unverified existing-Work family is waiting for. */
const findingKeysOf = ({ detail }: OnixPlanBlocker): string[] =>
  typeof detail.findingKey === 'string'
    ? [detail.findingKey]
    : Array.isArray(detail.findingKeys)
      ? [...(detail.findingKeys as readonly string[])]
      : [];

const stringDetail = (detail: OnixPlanFinding['detail'], key: string): string | null => {
  const value = detail[key];

  return typeof value === 'string' && value.length > 0 ? value : null;
};

const evidenceOfFinding = (finding: OnixPlanFinding): OnixReviewEvidence => ({
  code: finding.code,
  classification: finding.classification,
  findingKey: finding.key,
  locations: finding.locations,
  detail: finding.detail,
  message: finding.message,
});

const stateOfAnswer = (answer: OnixPlanFinding['answer']): OnixReviewTaskState =>
  answer.state === 'ANSWERED' ? 'RESOLVED' : answer.state === 'REJECTED' ? 'REJECTED' : 'PENDING';

export const buildImportReviewModel = (
  sidecar: OnixImportPlanSidecar,
  context: OnixReviewPresentationContext = {},
): OnixImportReviewModel => {
  const { inputs, records, products, workGroups, blockers, compatibility } = sidecar;
  const findings = sidecar.findings ?? [];

  const recordByKey = new Map(records.map((record) => [record.recordKey, record]));
  const productByKey = new Map(products.map((product) => [product.productKey, product]));
  const groupByKey = new Map(workGroups.map((group) => [group.groupKey, group]));
  const findingByKey = new Map(findings.map((finding) => [finding.key, finding]));
  const descriptiveFamilyByKey = new Map(sidecar.descriptive.findings.map(({ key, family }) => [key, family]));
  const recordLabel = (record: OnixPlannedRecord | undefined) =>
    record === undefined ? '' : (record.recordReference ?? `#${record.index}`);
  const productLabel = (productKey: string) =>
    (productByKey.get(productKey)?.recordKeys ?? [])
      .map((recordKey) => recordLabel(recordByKey.get(recordKey)))
      .filter((label) => label.length > 0)
      .join(', ');
  const groupKeyOfProduct = (productKey: string | null) =>
    productKey === null ? null : (productByKey.get(productKey)?.groupKey ?? null);

  // Every finding key a blocker names: a finding the plan waits on, answered or not.
  const blockedKeys = new Set(blockers.flatMap(findingKeysOf));

  // Component facts, for the scope of a finding about one content item.
  const componentFacts = Object.values(sidecar.components?.products ?? {}).flatMap(({ components }) => components);
  const componentScopeOf = (finding: OnixPlanFinding): OnixReviewScope => {
    const productKey = finding.productKey;

    if (productKey === null) return { kind: 'WORK' };

    const about = componentFacts.filter(
      (fact) =>
        fact.productKey === productKey &&
        finding.locations.some(({ path }) => path === fact.path || path.startsWith(`${fact.path}/`)),
    );

    return about.length === 1
      ? { kind: 'COMPONENT', productKey, position: String(about[0].position), label: productLabel(productKey) }
      : { kind: 'PRODUCT', productKey, label: productLabel(productKey) };
  };
  const scopeOfFinding = (finding: OnixPlanFinding): OnixReviewScope =>
    finding.family === 'COMPONENT' || finding.family === 'COLLATERAL' || finding.family === 'REVIEWS_PRIZES'
      ? componentScopeOf(finding)
      : finding.productKey === null
        ? { kind: 'WORK' }
        : { kind: 'PRODUCT', productKey: finding.productKey, label: productLabel(finding.productKey) };

  // The contributor a descriptive finding is about, named from the canonical descriptive plan where it binds the
  // finding's key: display context only.
  const contributorOf = (finding: OnixPlanFinding): string | null => {
    const group = context.descriptive?.groups[finding.groupKey];
    const intents = [
      ...(group?.contributors.intents ?? []),
      ...(finding.productKey === null
        ? []
        : (context.descriptive?.products[finding.productKey]?.contributors.intents ?? [])),
    ];
    const intent = intents.find(
      ({ nameFindingKey, fullNameFindingKey, biographyCanonicalFindingKey, biographies }) =>
        nameFindingKey === finding.key ||
        fullNameFindingKey === finding.key ||
        biographyCanonicalFindingKey === finding.key ||
        biographies.some(({ localeFindingKey }) => localeFindingKey === finding.key),
    );

    return intent === undefined || intent.fullName.length === 0 ? null : intent.fullName;
  };
  const subjectOf = (finding: OnixPlanFinding): string | null =>
    stringDetail(finding.detail, 'name') ??
    stringDetail(finding.detail, 'affiliation') ??
    stringDetail(finding.detail, 'funder') ??
    (finding.family === 'DESCRIPTIVE' ? contributorOf(finding) : null);

  // Structured price candidates, for the result-oriented labels of a price decision (#179 6036599101 D).
  const commercialFindingByKey = new Map((sidecar.commercial?.findings ?? []).map((finding) => [finding.key, finding]));
  const priceControl = (finding: OnixPlanFinding): OnixReviewControl => {
    const commercial = commercialFindingByKey.get(finding.key);
    const resolution = commercial?.resolution;
    const options = finding.resolution.kind === 'CHOICE' ? finding.resolution.options : [];

    if (resolution !== undefined && (resolution.kind === 'PRICE_CHOICE' || resolution.kind === 'PRICE_OVERRIDE')) {
      return {
        kind: 'PRICE',
        currencyCode: resolution.currencyCode,
        candidates: resolution.candidates.map(({ key, currencyCode, amount, unitPrice }) => ({
          key,
          currencyCode,
          amount,
          unitPrice,
        })),
        omitOffered: options.some(({ key }) => key === ONIX_PRICE_OMIT),
      };
    }

    return { kind: 'CHOICE', options };
  };

  const controlOf = (finding: OnixPlanFinding): OnixReviewControl | null => {
    const { resolution } = finding;

    switch (resolution.kind) {
      case 'NONE':
        return null;
      case 'ACKNOWLEDGE':
        return { kind: 'ACKNOWLEDGE' };
      case 'INPUT':
        switch (resolution.input) {
          case 'LOCALE':
            return { kind: 'LOCALE', suggestion: resolution.suggestion ?? null };
          case 'DATE':
            return { kind: 'DATE' };
          case 'TEXT':
            return { kind: 'TEXT' };
          case 'ORDINAL':
            return { kind: 'ORDINAL' };
        }
        return null;
      case 'CHOICE':
        if (finding.family === 'COMMERCIAL') return priceControl(finding);
        if (finding.family === 'DESCRIPTIVE' && INSTITUTION_CODES.has(finding.code)) {
          return {
            kind: 'INSTITUTION',
            options: resolution.options.filter(({ key }) => key !== 'OMIT'),
            omitOption: resolution.options.find(({ key }) => key === 'OMIT') ?? null,
          };
        }

        return { kind: 'CHOICE', options: resolution.options };
    }
  };

  /*
   * Every canonical finding the publisher can answer, once each, as the resolver states it (thoth-app#217 Correction 2):
   * answered, refused, or waiting. A waiting finding is required where a blocker names it; one nothing waits on - an
   * optional pairing, an alternative to an automatic price - is offered without counting. A finding whose resolution is
   * NONE is never a task: what blocks among them is a problem below, and what does not is deterministic target loss the
   * publisher is not asked about (#179 6036599101 F).
   */
  const findingTasks: OnixReviewTask[] = findings.flatMap((finding) => {
    const control = controlOf(finding);

    if (control === null || finding.answer.state === 'NOT_APPLICABLE') return [];

    const state = stateOfAnswer(finding.answer);
    const required = state !== 'PENDING' || blockedKeys.has(finding.key) || finding.blocking;

    // A required finding nothing waits on - a Publication left out or already present - asks nothing now.
    if (state === 'PENDING' && finding.blocking && !blockedKeys.has(finding.key)) return [];

    return [
      {
        key: finding.key,
        family: finding.family,
        code: finding.code,
        groupKey: finding.groupKey,
        scope: scopeOfFinding(finding),
        subject: subjectOf(finding),
        topic: finding.family === 'DESCRIPTIVE' ? (descriptiveFamilyByKey.get(finding.key) ?? null) : null,
        required,
        state,
        answer:
          finding.answer.state === 'ANSWERED' || finding.answer.state === 'REJECTED' ? finding.answer.value : undefined,
        control,
        input: { field: INPUT_FIELD_OF_FAMILY[finding.family], key: finding.key },
        evidence: evidenceOfFinding(finding),
      },
    ];
  });

  /* WorkType and edition, decided per new Work (#179 6036599101 A). */
  const workTypeTask = (group: OnixPlannedWorkGroup): OnixReviewTask | null => {
    if (group.target !== 'NEW_WORK') return null;

    const answer = inputs.workTypeOverrides[group.groupKey];
    const state: OnixReviewTaskState =
      group.workType.status === 'RESOLVED' ? 'RESOLVED' : answer === undefined ? 'PENDING' : 'REJECTED';
    const blocker = blockers.find(({ code, groupKey }) => WORK_TYPE_BLOCKERS.has(code) && groupKey === group.groupKey);

    return {
      key: `work-type|${group.groupKey}`,
      family: 'WORK',
      code: 'WORK_TYPE',
      groupKey: group.groupKey,
      scope: { kind: 'WORK' },
      subject: null,
      topic: null,
      required: true,
      state,
      answer,
      control: { kind: 'WORK_TYPE', suggestion: group.workTypeSuggestion ?? null, options: ONIX_WORK_OVERRIDE_TYPES },
      input: { field: 'workTypeOverrides', key: group.groupKey },
      evidence: {
        code: blocker?.code ?? 'WORK_TYPE',
        classification: blocker?.classification ?? null,
        findingKey: null,
        locations: (blocker?.paths ?? []).map((path) => ({ path, sourcePath: path })),
        detail: blocker?.detail ?? {},
        message: null,
      },
    };
  };
  const editionTask = (group: OnixPlannedWorkGroup): OnixReviewTask | null => {
    const blocker = blockers.find(({ code, groupKey }) => EDITION_BLOCKERS.has(code) && groupKey === group.groupKey);
    const answer = inputs.editionInputs[group.groupKey];
    const given = group.edition.status === 'RESOLVED' && group.edition.basis === 'USER_INPUT';

    if (group.target !== 'NEW_WORK' || (blocker === undefined && !given && answer === undefined)) return null;

    return {
      key: `edition|${group.groupKey}`,
      family: 'WORK',
      code: 'EDITION',
      groupKey: group.groupKey,
      scope: { kind: 'WORK' },
      subject: null,
      topic: null,
      required: true,
      state: given ? 'RESOLVED' : answer === undefined ? 'PENDING' : 'REJECTED',
      answer: answer === undefined ? undefined : String(answer),
      control: { kind: 'EDITION' },
      input: { field: 'editionInputs', key: group.groupKey },
      evidence: {
        code: blocker?.code ?? 'EDITION',
        classification: blocker?.classification ?? null,
        findingKey: null,
        locations: (blocker?.paths ?? []).map((path) => ({ path, sourcePath: path })),
        detail: blocker?.detail ?? {},
        message: null,
      },
    };
  };

  /* What each Product's manifestation leaves to the publisher (thoth-app#182 contracts). */
  const manifestationTask = (product: OnixPlannedProduct): OnixReviewTask | null => {
    const { manifestation, productKey } = product;
    const answer = inputs.manifestationChoices[productKey];
    const blocker = blockers.find(
      ({ code, productKey: blocked }) => MANIFESTATION_BLOCKERS.has(code) && blocked === productKey,
    );
    const base = {
      key: `manifestation|${productKey}`,
      family: 'PRODUCT' as const,
      code: 'MANIFESTATION',
      groupKey: product.groupKey,
      scope: { kind: 'PRODUCT' as const, productKey, label: productLabel(productKey) },
      subject: null,
      topic: null,
      answer,
      input: { field: 'manifestationChoices' as const, key: productKey },
      evidence: {
        code: blocker?.code ?? `MANIFESTATION_${manifestation.kind}`,
        classification: blocker?.classification ?? null,
        findingKey: null,
        locations: (blocker?.paths ?? []).map((path) => ({ path, sourcePath: path })),
        detail: {
          ...(blocker?.detail ?? {}),
          ...('reason' in manifestation ? { reason: manifestation.reason } : {}),
          notes: manifestation.notes.map(({ code, detail }) => (detail === null ? code : `${code}: ${detail}`)),
        },
        message: null,
      },
    };

    switch (manifestation.kind) {
      case 'INPUT_REQUIRED': {
        const offered = answer === ONIX_MANIFESTATION_OMIT || manifestation.candidates.some((type) => type === answer);

        return {
          ...base,
          required: true,
          state: answer === undefined ? 'PENDING' : offered && blocker === undefined ? 'RESOLVED' : 'REJECTED',
          control: {
            kind: 'MANIFESTATION',
            candidates: manifestation.candidates,
            resolvedType: null,
            omitOffered: true,
          },
        };
      }
      case 'UNREPRESENTABLE':
        if (!manifestation.acknowledgementRequired) return null;

        return {
          ...base,
          required: true,
          state: answer === ONIX_MANIFESTATION_OMIT ? 'RESOLVED' : answer === undefined ? 'PENDING' : 'REJECTED',
          control: { kind: 'MANIFESTATION', candidates: [], resolvedType: null, omitOffered: true },
        };
      case 'RESOLVED':
        if (product.omittable !== true && answer === undefined) return null;

        // Leaving a resolved Publication out is the publisher's option, never a decision the plan waits on.
        return {
          ...base,
          required: false,
          state: answer === ONIX_MANIFESTATION_OMIT ? 'RESOLVED' : answer === undefined ? 'PENDING' : 'REJECTED',
          control: {
            kind: 'MANIFESTATION',
            candidates: [],
            resolvedType: manifestation.type,
            omitOffered: product.omittable === true,
          },
        };
    }
  };

  /* File-level decisions: records Thoth cannot apply, and the Thoth compatibility confirmation. */
  const recordTasks: OnixReviewTask[] = records.flatMap((record) => {
    if (!ONIX_EXCLUDABLE_DISPOSITIONS.has(record.disposition)) return [];

    const excluded = inputs.excludedRecordKeys.includes(record.recordKey);
    const blocker = blockers.find(({ code, recordKey }) => RECORD_BLOCKERS.has(code) && recordKey === record.recordKey);

    if (!excluded && blocker === undefined) return [];

    return [
      {
        key: `record|${record.recordKey}`,
        family: 'RECORD' as const,
        code: record.disposition,
        groupKey: null,
        scope: { kind: 'RECORD' as const, recordKey: record.recordKey, label: recordLabel(record) },
        subject: record.notificationType,
        topic: null,
        required: true,
        state: excluded ? ('RESOLVED' as const) : ('PENDING' as const),
        answer: excluded ? 'true' : undefined,
        control: { kind: 'CONFIRM' as const },
        input: { field: 'excludedRecordKeys' as const, key: record.recordKey },
        evidence: {
          code: blocker?.code ?? record.disposition,
          classification: blocker?.classification ?? null,
          findingKey: null,
          locations: (blocker?.paths ?? []).map((path) => ({ path, sourcePath: path })),
          detail: { ...(blocker?.detail ?? {}), deletionText: record.deletionText },
          message: null,
        },
      },
    ];
  });
  const compatibilityTask: OnixReviewTask | null =
    compatibility.activation === 'AWAITING_CONFIRMATION' || compatibility.activation === 'CONFIRMED'
      ? {
          key: 'thoth-compatibility',
          family: 'FILE',
          code: 'THOTH_COMPATIBILITY',
          groupKey: null,
          scope: { kind: 'FILE' },
          subject: null,
          topic: null,
          required: true,
          state: inputs.thothCompatibilityConfirmed ? 'RESOLVED' : 'PENDING',
          answer: inputs.thothCompatibilityConfirmed ? 'true' : undefined,
          control: { kind: 'CONFIRM' },
          input: { field: 'thothCompatibilityConfirmed' },
          evidence: {
            code: 'THOTH_COMPATIBILITY_CONFIRMATION_REQUIRED',
            classification: null,
            findingKey: null,
            locations: [],
            detail: { activation: compatibility.activation },
            message: null,
          },
        }
      : null;

  const workTasks = workGroups.flatMap((group) => [workTypeTask(group), editionTask(group)]);
  const productTasks = products.map(manifestationTask);
  const taskKeys = new Set(
    [...workTasks, ...productTasks, ...findingTasks, ...recordTasks, compatibilityTask]
      .filter((task): task is OnixReviewTask => task !== null)
      .map(({ key }) => key),
  );

  /* An answer to a finding this file does not have: refused by the resolver, and clearable here, nothing more. */
  const staleTasks: OnixReviewTask[] = blockers.flatMap((blocker) => {
    const field = INPUT_FIELD_OF_STALE_BLOCKER[blocker.code];
    const findingKey = typeof blocker.detail.findingKey === 'string' ? blocker.detail.findingKey : null;

    if (field === undefined || findingKey === null || findingByKey.has(findingKey)) return [];

    const groupKey = blocker.groupKey ?? groupKeyOfProduct(blocker.productKey);
    const given = inputs[field]?.[findingKey];

    return [
      {
        key: `stale|${findingKey}`,
        family: 'FILE' as const,
        code: blocker.code,
        groupKey,
        scope:
          blocker.productKey === null
            ? groupKey === null
              ? { kind: 'FILE' as const }
              : { kind: 'WORK' as const }
            : { kind: 'PRODUCT' as const, productKey: blocker.productKey, label: productLabel(blocker.productKey) },
        subject: null,
        topic: null,
        required: true,
        state: 'REJECTED' as const,
        answer: given === undefined ? undefined : String(given),
        control: { kind: 'CLEAR' as const },
        input: { field, key: findingKey },
        evidence: {
          code: blocker.code,
          classification: blocker.classification,
          findingKey,
          locations: blocker.paths.map((path) => ({ path, sourcePath: path })),
          detail: blocker.detail,
          message: null,
        },
      },
    ];
  });
  const consumedFindingKeys = new Set([
    ...taskKeys,
    ...staleTasks.map(({ input }) => ('key' in input ? input.key : '')),
  ]);

  /* Blockers no task answers are problems: the file, or Thoth, has to change for them. */
  const consumed = (blocker: OnixPlanBlocker): boolean => {
    if (findingKeysOf(blocker).some((key) => consumedFindingKeys.has(key))) return true;
    if (WORK_TYPE_BLOCKERS.has(blocker.code)) return taskKeys.has(`work-type|${blocker.groupKey ?? ''}`);
    if (EDITION_BLOCKERS.has(blocker.code)) return taskKeys.has(`edition|${blocker.groupKey ?? ''}`);
    if (MANIFESTATION_BLOCKERS.has(blocker.code)) return taskKeys.has(`manifestation|${blocker.productKey ?? ''}`);
    if (RECORD_BLOCKERS.has(blocker.code)) return taskKeys.has(`record|${blocker.recordKey ?? ''}`);
    if (blocker.code === 'THOTH_COMPATIBILITY_CONFIRMATION_REQUIRED') return compatibilityTask !== null;

    return false;
  };
  const problems: OnixReviewProblem[] = blockers
    .filter((blocker) => !consumed(blocker))
    .map((blocker) => {
      const named = findingKeysOf(blocker)
        .map((key) => findingByKey.get(key))
        .filter((finding): finding is OnixPlanFinding => finding !== undefined);
      const groupKey = blocker.groupKey ?? groupKeyOfProduct(blocker.productKey);
      const evidence: OnixReviewEvidence =
        named.length === 1
          ? {
              ...evidenceOfFinding(named[0]),
              classification: blocker.classification,
              detail: { ...named[0].detail, ...blocker.detail },
            }
          : {
              code: blocker.code,
              classification: blocker.classification,
              findingKey: null,
              locations: blocker.paths.map((path) => ({ path, sourcePath: path })),
              detail: blocker.detail,
              message: named.map(({ message }) => message).join(' ') || null,
            };
      const detailText = Object.entries(blocker.detail)
        .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : String(value)}`)
        .join(';');

      return {
        key: [
          blocker.code,
          blocker.recordKey,
          blocker.productKey,
          blocker.groupKey,
          blocker.paths.join(','),
          detailText,
        ].join('|'),
        code: blocker.code,
        classification: blocker.classification,
        groupKey,
        scope:
          blocker.productKey !== null
            ? { kind: 'PRODUCT', productKey: blocker.productKey, label: productLabel(blocker.productKey) }
            : blocker.recordKey !== null
              ? { kind: 'RECORD', recordKey: blocker.recordKey, label: recordLabel(recordByKey.get(blocker.recordKey)) }
              : groupKey !== null
                ? { kind: 'WORK' }
                : { kind: 'FILE' },
        evidence,
      };
    });

  /* Resolved facts, read from the sidecar and the display context. */
  const licenceOf = (groupKey: string): OnixWorkLicenceAction['action'] | null => {
    const action = sidecar.licenceActions?.find((candidate) => candidate.groupKey === groupKey)?.action;

    if (action !== undefined) return action;

    // A sidecar resolved without licence actions: the rights reduction's decision says what a new Work gets.
    const decision = sidecar.rights?.groups[groupKey]?.licence;

    if (decision === undefined) return null;

    return decision.kind === 'SET_SUPPORTED_LICENSE'
      ? { kind: 'SET_SUPPORTED_LICENSE', identity: decision.identity, url: decision.url }
      : decision.kind === 'UNSET'
        ? { kind: 'UNSET' }
        : { kind: 'BLOCKED' };
  };
  const profileActive = (group: OnixPlannedWorkGroup) =>
    group.compatibility === 'THOTH_PROFILE' &&
    (group.thothVerification === 'VERIFIED' ||
      (group.thothVerification === 'UNVERIFIED' && inputs.thothCompatibilityConfirmed));
  const coverOf = (group: OnixPlannedWorkGroup, tasksOfWork: readonly OnixReviewTask[]): 'FOUND' | 'NONE' | null => {
    const descriptive = context.descriptive?.groups[group.groupKey];

    if (descriptive === undefined) return null;

    const decision = profileActive(group) ? descriptive.profileCover : descriptive.cover;

    switch (decision.kind) {
      case 'VALUE':
        return 'FOUND';
      case 'CHOICE': {
        // The publisher's answer to the canonical cover choice names which option stands: shown, never chosen here.
        const task = tasksOfWork.find(({ key, state }) => key === decision.findingKey && state === 'RESOLVED');
        const chosen = task === undefined ? undefined : decision.options.find(({ key }) => key === task.answer);

        return chosen === undefined ? null : chosen.value === null ? 'NONE' : 'FOUND';
      }
      default:
        return null;
    }
  };
  const titleOf = (group: OnixPlannedWorkGroup): string | null => {
    if (group.target === 'EXISTING_WORK' && group.existingWorkId !== null) {
      const existing = context.targets?.works.find(({ workId }) => workId === group.existingWorkId);

      return existing === undefined || existing.title.length === 0 ? null : existing.title;
    }

    if (group.plannedWorkId !== null) {
      const candidate = context.candidatePlan?.works.find(({ id }) => id === group.plannedWorkId);

      if (candidate !== undefined && candidate.titles.length > 0) {
        const { title } = getDisplayTitle(candidate.titles);

        return title.length > 0 ? title : null;
      }
    }

    // A candidate Work carries no title before resolution: the one canonical title the descriptive plan already
    // decided for the group names it. Where the canonical title is still the publisher's choice, nothing is assumed.
    const titles = context.descriptive?.groups[group.groupKey]?.titles;

    if (titles !== undefined && titles.canonicalFindingKey === null && titles.canonical.length === 1) {
      const [{ title, fullTitle }] = titles.canonical;
      const shown = title.length > 0 ? title : fullTitle;

      return shown.length > 0 ? shown : null;
    }

    return null;
  };
  const priceResolutions = sidecar.priceResolutions ?? [];
  const publicationOf = (product: OnixPlannedProduct, group: OnixPlannedWorkGroup): OnixReviewPublication => {
    const action: OnixReviewPublication['action'] =
      product.action ??
      (group.target === null ||
      blockers.some(
        (blocker) => blocker.productKey === product.productKey && PROBLEM_CLASSIFICATIONS.has(blocker.classification),
      )
        ? 'BLOCKED'
        : 'NEEDS_INPUT');

    return {
      productKey: product.productKey,
      label: productLabel(product.productKey),
      isbn: product.isbn,
      type: product.publicationType ?? (product.manifestation.kind === 'RESOLVED' ? product.manifestation.type : null),
      action,
      prices: priceResolutions
        .filter(({ productKey }) => productKey === product.productKey)
        .map(({ currencyCode, unitPrice, basis, findingKey }) => ({
          currencyCode,
          unitPrice,
          basis,
          taskKey: taskKeys.has(findingKey) ? findingKey : null,
        })),
      manifestationTaskKey: taskKeys.has(`manifestation|${product.productKey}`)
        ? `manifestation|${product.productKey}`
        : null,
    };
  };

  const works: OnixReviewWork[] = workGroups.map((group, index) => {
    const ownTasks = [
      ...workTasks.filter((task): task is OnixReviewTask => task !== null && task.groupKey === group.groupKey),
      ...productTasks.filter((task): task is OnixReviewTask => task !== null && task.groupKey === group.groupKey),
      ...findingTasks.filter(({ groupKey }) => groupKey === group.groupKey),
      ...staleTasks.filter(({ groupKey }) => groupKey === group.groupKey),
    ];
    const ownProblems = problems.filter(({ groupKey }) => groupKey === group.groupKey);
    const requiredConfirmations = pendingReviewTasks(ownTasks).length;
    const workTypeKey = `work-type|${group.groupKey}`;
    const editionKey = `edition|${group.groupKey}`;

    return {
      groupKey: group.groupKey,
      position: index + 1,
      title: titleOf(group),
      target: group.target,
      existingWorkId: group.existingWorkId,
      workType: group.workType.status === 'RESOLVED' ? group.workType.type : null,
      workTypeTaskKey: ownTasks.some(({ key }) => key === workTypeKey) ? workTypeKey : null,
      edition: group.edition.status === 'RESOLVED' ? group.edition.edition : null,
      editionTaskKey: ownTasks.some(({ key }) => key === editionKey) ? editionKey : null,
      licence: licenceOf(group.groupKey),
      cover: coverOf(group, ownTasks),
      publications: products
        .filter(({ groupKey }) => groupKey === group.groupKey)
        .map((product) => publicationOf(product, group)),
      tasks: ownTasks,
      problems: ownProblems,
      state: ownProblems.length > 0 ? 'BLOCKED' : requiredConfirmations > 0 ? 'NEEDS_CONFIRMATION' : 'READY',
      requiredConfirmations,
    };
  });

  const fileTasks = [
    ...(compatibilityTask === null ? [] : [compatibilityTask]),
    ...recordTasks,
    ...staleTasks.filter(({ groupKey }) => groupKey === null || !groupByKey.has(groupKey)),
    // A finding task whose Work the sidecar does not hold belongs to the file rather than to nothing.
    ...findingTasks.filter(({ groupKey }) => !groupByKey.has(groupKey ?? '')),
  ];
  const fileProblems = problems.filter(({ groupKey }) => groupKey === null || !groupByKey.has(groupKey));

  /* The compact reassurance (#179 6036599101 H): counts of what was handled, never a ledger of every finding. */
  const automatic: OnixReviewAutomaticItem[] = (
    [
      { kind: 'GROUPED', count: workGroups.filter(({ productKeys }) => productKeys.length > 1).length },
      { kind: 'FORMATS', count: products.filter(({ manifestation }) => manifestation.kind === 'RESOLVED').length },
      { kind: 'COVERS', count: works.filter(({ cover }) => cover === 'FOUND').length },
      { kind: 'PRICES', count: priceResolutions.filter(({ basis }) => basis === 'AUTOMATIC').length },
      {
        kind: 'LICENCES',
        count: works.filter(
          ({ licence }) => licence?.kind === 'SET_SUPPORTED_LICENSE' || licence?.kind === 'ALREADY_PRESENT',
        ).length,
      },
      { kind: 'EXISTING', count: workGroups.filter(({ target }) => target === 'EXISTING_WORK').length },
    ] as const
  ).filter(({ count }) => count > 0);

  const worksNeedingAttention = works.filter(({ state }) => state !== 'READY').length;
  const requiredConfirmations =
    works.reduce((count, work) => count + work.requiredConfirmations, 0) + pendingReviewTasks(fileTasks).length;
  const createsSomething =
    workGroups.some(({ target }) => target === 'NEW_WORK') ||
    products.some(({ action }) => action === 'CREATE_PUBLICATION_ON_EXISTING_WORK') ||
    (sidecar.relatedMaterial?.edges ?? []).some(({ state }) => state === 'PLANNED');

  return {
    works,
    totals: {
      works: works.length,
      publications: products.length,
      requiredConfirmations,
      worksNeedingAttention,
      problems: problems.length,
    },
    fileTasks,
    fileProblems,
    automatic,
    executable: sidecar.executable,
    createsSomething,
    compatibility: compatibility.activation,
    defaultFilter: works.length > 1 && worksNeedingAttention > 0 ? 'ATTENTION' : 'ALL',
  };
};
