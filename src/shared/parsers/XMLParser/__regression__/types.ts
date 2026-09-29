import type { PublicationType } from '@/src/entities/publication/model/publication.types';
import type { FormFieldOption } from '@/src/shared/interfaces';
import type {
  OnixEditionResolution,
  OnixManifestationDecision,
  OnixPlanBlockerClassification,
  OnixPlanFindingAnswer,
  OnixPlanFindingClassification,
  OnixPlanFindingFamily,
  OnixPlanFindingResolution,
  OnixPlanInputs,
  OnixProductTargetAction,
  OnixRecordDisposition,
  OnixWorkDoiDecision,
  OnixWorkTargetAction,
  OnixWorkTypeResolution,
} from '@/src/shared/types/onixPlanning';

import type {
  FindingClass,
  FindingProjection,
  FindingScope,
  FindingTier,
  OnixFlavour,
  OnixRelease,
  Recoverability,
  RecoveryMarker,
} from '../validation';

/**
 * The ONIX contract regression vocabulary (thoth-app#236, parent #188).
 *
 * A fixture states what the accepted importer contract does with one ONIX source, stage by stage, in the
 * contract's own semantic terms: canonical finding ids and classes, plan blocker and finding codes and their
 * classifications, the actions the resolver takes. Nothing here is UI text; no assertion reads a message.
 */

/** The programme's outcome vocabulary (#188 test matrix) that every regression assertion can bind to. */
export const ONIX_REGRESSION_OUTCOMES = [
  'SOURCE_INVALID',
  'SUPPORTED_LOSSLESS',
  'SUPPORTED_NORMALIZED',
  'SUPPORTED_WITH_WARNING',
  'TARGET_UNREPRESENTABLE',
  'TARGET_INPUT_REQUIRED',
  'UNKNOWN',
] as const;

export type OnixRegressionOutcome = (typeof ONIX_REGRESSION_OUTCOMES)[number];

/**
 * Every classification a stage of the contract emits. The programme outcomes are a subset: the plan contracts
 * also classify `SOURCE_CONFLICT`, `PREFLIGHT_GAP` and `EXECUTION_DEFERRED`, and the ledger drops none of them.
 */
export type OnixContractClassification =
  | OnixRegressionOutcome
  | OnixPlanFindingClassification
  | OnixPlanBlockerClassification;

/* ------------------------------------------------------------------------------------------------ */
/* Observed ledger: the semantic projection of one pipeline run                                     */
/* ------------------------------------------------------------------------------------------------ */

/**
 * What the canonical source gate decided, derived only from the scopes of the findings that count:
 * - `PERMITTED`: target planning may continue (`permitsTargetPlanning`);
 * - `SOURCE_INVALID`: at least one counting finding of scope VALIDITY;
 * - `SOURCE_UNSUPPORTED`: counting SUPPORT findings only (release/flavour outside the supported contract);
 * - `SOURCE_REFUSED_SECURITY`: counting SECURITY findings only (DTD/prolog boundary);
 * - `NOT_PERMITTED`: refused without any counting finding (a stopped or incomplete result).
 */
export type OnixSourceGateVerdict =
  | 'PERMITTED'
  | 'SOURCE_INVALID'
  | 'SOURCE_UNSUPPORTED'
  | 'SOURCE_REFUSED_SECURITY'
  | 'NOT_PERMITTED';

/** One canonical source finding, by its semantic fields only (never its message). */
export type OnixSourceFindingEntry = {
  readonly id: string;
  readonly tier: FindingTier;
  readonly scope: FindingScope;
  readonly class: FindingClass;
  readonly blocking: boolean;
  readonly projection: FindingProjection;
  readonly recoverability: Recoverability;
  readonly counts: boolean;
  readonly path: string | null;
};

/** One approved recovery the source gate applied, and where. */
export type OnixRecoveryEntry = {
  readonly recovery: RecoveryMarker['recovery'];
  readonly path: string;
};

export type OnixSourceGateLedger = {
  readonly verdict: OnixSourceGateVerdict;
  readonly release: OnixRelease | null;
  readonly flavour: OnixFlavour | null;
  /** Every canonical finding, in ledger order. */
  readonly findings: readonly OnixSourceFindingEntry[];
  /** Every approved recovery, in marker order. */
  readonly recoveries: readonly OnixRecoveryEntry[];
};

export type OnixRecordEntry = {
  readonly index: number;
  readonly recordReference: string | null;
  readonly disposition: OnixRecordDisposition;
  readonly productKey: string | null;
  readonly action: 'PLANNED' | 'OMIT/EXCLUDED' | 'BLOCKED';
};

export type OnixProductEntry = {
  readonly productKey: string;
  readonly groupKey: string;
  readonly isbn: string | null;
  /** The contract's own decision, whole: kind, classification or reason, candidates and notes. */
  readonly manifestation: OnixManifestationDecision;
  readonly publicationType: PublicationType | null;
  readonly action: OnixProductTargetAction | null;
  readonly executable: boolean;
};

export type OnixWorkGroupEntry = {
  readonly groupKey: string;
  readonly productKeys: readonly string[];
  readonly target: OnixWorkTargetAction | null;
  readonly workType: OnixWorkTypeResolution;
  readonly edition: OnixEditionResolution;
  readonly workDoi: OnixWorkDoiDecision;
  readonly executable: boolean;
};

export type OnixBlockerEntry = {
  readonly code: string;
  readonly classification: OnixPlanBlockerClassification;
  readonly recordKey: string | null;
  readonly productKey: string | null;
  readonly groupKey: string | null;
};

export type OnixPlanFindingEntry = {
  readonly family: OnixPlanFindingFamily;
  readonly code: string;
  readonly classification: OnixPlanFindingClassification;
  readonly blocking: boolean;
  readonly resolution: OnixPlanFindingResolution['kind'];
  readonly answer: OnixPlanFindingAnswer['state'];
  readonly productKey: string | null;
  readonly groupKey: string;
};

/** One Work the executable plan would create, by the semantic values the import writes. */
export type OnixPlannedWorkEntry = {
  readonly type: string;
  readonly status: string;
  readonly doi: string;
  readonly edition: number | null;
  readonly publicationDate: string | null;
  readonly pageCount: number;
  readonly titles: readonly {
    readonly canonical: boolean;
    readonly localeCode: string;
    readonly fullTitle: string;
    readonly title: string;
    readonly subtitle: string;
  }[];
  readonly publications: readonly { readonly type: string; readonly isbn: string }[];
  readonly contributions: readonly {
    readonly fullName: string;
    readonly type: string;
    readonly isMain: boolean;
    readonly orderNumber: number;
  }[];
  readonly languages: readonly { readonly code: string; readonly relation: string }[];
  readonly subjects: readonly { readonly type: string; readonly code: string; readonly ordinal: number }[];
};

/** One chapter Work the executable plan would create beside its parent. */
export type OnixPlannedChapterEntry = {
  readonly type: string;
  readonly fullTitle: string;
  readonly firstPage: string;
  readonly lastPage: string;
  readonly pageCount: number;
};

export type OnixPlanningLedger = {
  /** Whether the resolver offers a plan the current executor can run (`OnixResolvedImportPlan.plan !== null`). */
  readonly executable: boolean;
  readonly records: readonly OnixRecordEntry[];
  readonly products: readonly OnixProductEntry[];
  readonly workGroups: readonly OnixWorkGroupEntry[];
  readonly blockers: readonly OnixBlockerEntry[];
  readonly findings: readonly OnixPlanFindingEntry[];
  /** The Works the executable plan creates; empty while anything blocks. */
  readonly works: readonly OnixPlannedWorkEntry[];
  /** The chapter Works the executable plan creates; empty while anything blocks. */
  readonly chapters: readonly OnixPlannedChapterEntry[];
};

/** One classified outcome of a run, in the programme vocabulary, from whichever stage emitted it. */
export type OnixOutcomeEntry = {
  readonly stage: 'SOURCE_GATE' | 'MANIFESTATION' | 'PLAN_BLOCKER' | 'PLAN_FINDING';
  readonly outcome: OnixContractClassification;
  /** The verdict, manifestation type, blocker code or `FAMILY/CODE` of the finding. */
  readonly code: string;
  /** The product or group key the outcome is about, where it is about one. */
  readonly subject: string | null;
  readonly blocking: boolean;
};

/* ------------------------------------------------------------------------------------------------ */
/* Fixture declarations                                                                              */
/* ------------------------------------------------------------------------------------------------ */

/**
 * A known defect of a system outside the importer contract (the Thoth exporter, a publisher's feed) that a fixture's
 * source exhibits. A defect is never expected contract behaviour: it is declared here, and every expected entry it
 * causes carries its reference, so the suite reports it as the defect it is.
 */
export type OnixKnownDefect = {
  /** The issue that owns the correction, `owner/repo#number`. */
  readonly reference: string;
  /** Which system is wrong. `thoth-app` is not an option: an importer defect is a failing test, not a fixture state. */
  readonly owner: 'thoth' | 'publisher-source';
  readonly summary: string;
};

/** An expected entry, optionally attributed to one declared known defect. */
export type Attributed<T> = T & { readonly defect?: string };

/** Exact string values at XPath locations of the normalised Reference source (`onix:` is the source namespace). */
export type OnixNormalizedExpectation = Readonly<Record<string, readonly string[]>>;

export type OnixPlanningExpectation = {
  readonly executable: boolean;
  readonly records: readonly OnixRecordEntry[];
  readonly products: readonly OnixProductEntry[];
  readonly workGroups: readonly OnixWorkGroupEntry[];
  readonly blockers: readonly Attributed<OnixBlockerEntry>[];
  readonly findings: readonly Attributed<OnixPlanFindingEntry>[];
  readonly works: readonly OnixPlannedWorkEntry[];
  readonly chapters: readonly OnixPlannedChapterEntry[];
};

/** The publisher's decisions and target state one planning expectation is made under. */
export type OnixRegressionScenario = {
  readonly name: string;
  /** What Thoth already holds for the active publisher. Only an empty publisher is modelled so far. */
  readonly target: 'EMPTY_PUBLISHER';
  /** The publisher's answers, over `EMPTY_ONIX_PLAN_INPUTS`; absent means "as uploaded, nothing decided yet". */
  readonly inputs?: Partial<OnixPlanInputs>;
  readonly planning: OnixPlanningExpectation;
  /** Count of every classified outcome of the whole run (gate and this scenario's planning). */
  readonly outcomes: Readonly<Partial<Record<OnixContractClassification, number>>>;
};

export type OnixSourceGateExpectation = {
  readonly verdict: OnixSourceGateVerdict;
  readonly release: OnixRelease | null;
  readonly flavour: OnixFlavour | null;
  readonly findings: readonly Attributed<OnixSourceFindingEntry>[];
  readonly recoveries: readonly Attributed<OnixRecoveryEntry>[];
};

/**
 * - `CONTRACT`: the source is what the accepted contract is proven against; no entry may be attributed to a defect.
 * - `KNOWN_DEFECT`: the source exhibits one or more declared defects; every blocking entry must be attributed to one
 *   of them, each declared defect must explain at least one entry, and the fixture never counts as a passing
 *   contract or round-trip case.
 */
export type OnixFixtureStatus = 'CONTRACT' | 'KNOWN_DEFECT';

export type OnixRegressionFixture = {
  /** Equal to the fixture's directory name under `fixtures/`. */
  readonly id: string;
  readonly status: OnixFixtureStatus;
  /** The contract behaviour the fixture proves, in a sentence or two. */
  readonly purpose: string;
  readonly source: {
    readonly origin: 'SYNTHETIC' | 'SANITIZED_PUBLISHER' | 'THOTH_EXPORT';
    /** Where the bytes came from and what was changed; never the unsanitised publisher file itself. */
    readonly provenance: string;
    /** SHA-256 of `source.xml`, so an edit to the source is always a deliberate fixture change. */
    readonly sha256: string;
  };
  readonly defects: readonly OnixKnownDefect[];
  /** The clock the planner runs under: lifecycle and date decisions compare against it. */
  readonly asOf: string;
  readonly imprints: readonly FormFieldOption[];
  readonly gate: OnixSourceGateExpectation;
  /** Required when the gate permits planning; must be absent otherwise. */
  readonly normalized?: OnixNormalizedExpectation;
  /** Required when the gate permits planning (at least one); must be empty otherwise. */
  readonly scenarios: readonly OnixRegressionScenario[];
  /** Count of every classified outcome when the gate refuses (no scenario runs); omitted when it permits. */
  readonly refusedOutcomes?: Readonly<Partial<Record<OnixContractClassification, number>>>;
};
