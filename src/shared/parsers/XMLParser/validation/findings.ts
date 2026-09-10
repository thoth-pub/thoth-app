/**
 * Source finding ledger (thoth#895 / thoth-app#179 VALIDATION-BASELINE-02).
 *
 * Every finding carries independent dimensions:
 * - `scope`: VALIDITY, SUPPORT or SECURITY;
 * - `class`: the versioned disposition (never the artifact's wording or role);
 * - `blocking`: the intrinsic severity of that class;
 * - `projection`: AUTHORITATIVE, SECONDARY (depends on tainted ordinary-invalid
 *   source) or NOT_EVALUABLE (the rule raised; never an implicit pass);
 * - `recoverability`: whether the approved recovery overlay applied.
 * `counts` is derived: only an authoritative, unrecovered blocking finding
 * contributes to the blocking verdict. Nothing is ever dropped from the ledger.
 */
export type FindingScope = 'VALIDITY' | 'SUPPORT' | 'SECURITY';

/** Canonical pipeline stage numbering of thoth#895. */
export type FindingStage = 1 | 2 | 3 | 5 | 6 | 7 | 8;

export type FindingTier =
  | 'RELEASE_FLAVOUR'
  | 'PROLOG'
  | 'WELL_FORMEDNESS'
  | 'SOURCE_ORDINARY'
  | 'CANONICAL_ORDINARY'
  | 'STRICT'
  | 'SCHEMATRON'
  | 'INVENTORY';

export type FindingClass =
  | 'PROCESSING_STOP'
  | 'SOURCE_INVALID'
  | 'NORMATIVE_INVALID'
  | 'ADVISORY'
  | 'EXTERNAL_ADOPTION_REQUIRED'
  | 'DEPRECATED_OR_INFORMATIONAL'
  | 'NON_DETERMINISTIC_OR_CONTEXTUAL'
  | 'PIN_SCOPED_UNREACHABLE'
  | 'RULE_NOT_EVALUABLE'
  | 'NOT_SOURCE_VALIDITY'
  | 'ARTIFACT_DEFECT';

export type FindingProjection = 'AUTHORITATIVE' | 'SECONDARY' | 'NOT_EVALUABLE';

export type Recoverability = 'NOT_RECOVERABLE' | 'OMIT_INVALID_COMPOSITE';

export interface SourceFinding {
  readonly id: string;
  readonly tier: FindingTier;
  readonly stage: FindingStage;
  readonly scope: FindingScope;
  readonly class: FindingClass;
  readonly blocking: boolean;
  readonly projection: FindingProjection;
  readonly recoverability: Recoverability;
  readonly counts: boolean;
  /** Inventoried Thoth policy that executes this finding, when applicable. */
  readonly policy?: string;
  /** Canonical Reference path of the context node. */
  readonly path?: string | null;
  /** Original source-flavour path (Short provenance) of the context node. */
  readonly sourcePath?: string | null;
  readonly message?: string;
  readonly detail?: Readonly<Record<string, unknown>>;
}

type FindingInput = Omit<SourceFinding, 'projection' | 'recoverability' | 'counts'> &
  Partial<Pick<SourceFinding, 'projection' | 'recoverability'>>;

export function makeFinding(input: FindingInput): SourceFinding {
  const projection = input.projection ?? 'AUTHORITATIVE';
  const recoverability = input.recoverability ?? 'NOT_RECOVERABLE';
  return {
    ...input,
    projection,
    recoverability,
    counts: input.blocking && projection === 'AUTHORITATIVE' && recoverability === 'NOT_RECOVERABLE',
  };
}

/** Classes that block source validity when authoritative. */
export function isBlockingClass(klass: FindingClass): boolean {
  return klass === 'NORMATIVE_INVALID' || klass === 'SOURCE_INVALID' || klass === 'PROCESSING_STOP';
}
