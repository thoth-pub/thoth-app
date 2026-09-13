import schematronDispositions from './data/schematronDispositions.json';
import strictDispositions from './data/strictDispositions.json';
import type { OnixSchemaRelease } from './types';

/**
 * Versioned strict-assertion dispositions keyed by (schema release, EDItEUR
 * rule id): a projection of SPIKE-02 v4 `strict_classification.json` to
 * `[class, authority kind, artifact defect]`. Artifact wording never decides
 * severity; only NORMATIVE_INVALID can block, and only when authoritative.
 */
export type StrictDispositionClass =
  | 'NORMATIVE_INVALID'
  | 'ADVISORY'
  | 'EXTERNAL_ADOPTION_REQUIRED'
  | 'DEPRECATED_OR_INFORMATIONAL'
  | 'NON_DETERMINISTIC_OR_CONTEXTUAL'
  | 'PIN_SCOPED_UNREACHABLE'
  | 'RULE_NOT_EVALUABLE';

export type StrictDisposition = readonly [
  klass: StrictDispositionClass,
  authorityKind: string,
  artifactDefect: string | null,
];

export const STRICT_DISPOSITIONS = strictDispositions as unknown as Readonly<
  Record<OnixSchemaRelease, Readonly<Record<string, StrictDisposition>>>
>;

export function strictDisposition(release: OnixSchemaRelease, id: string): StrictDisposition | undefined {
  const table = STRICT_DISPOSITIONS[release];
  return Object.prototype.hasOwnProperty.call(table, id) ? table[id] : undefined;
}

/**
 * Versioned Schematron dispositions keyed by (schema release, report id): a
 * projection of SPIKE-02 v4 `schematron_classification.json`. The report's
 * `role` attribute is never authority.
 */
export type SchematronDispositionClass =
  | 'NORMATIVE_INVALID'
  | 'ADVISORY'
  | 'DEPRECATED_OR_INFORMATIONAL'
  | 'NOT_SOURCE_VALIDITY';

export const SCHEMATRON_DISPOSITIONS = schematronDispositions as unknown as Readonly<
  Record<OnixSchemaRelease, Readonly<Record<string, SchematronDispositionClass>>>
>;

export function schematronDisposition(release: OnixSchemaRelease, id: string): SchematronDispositionClass | undefined {
  const table = SCHEMATRON_DISPOSITIONS[release];
  return Object.prototype.hasOwnProperty.call(table, id) ? table[id] : undefined;
}
