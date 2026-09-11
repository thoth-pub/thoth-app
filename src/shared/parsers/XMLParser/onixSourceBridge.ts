import { parse } from '@5stones/onix/dist/parse';

import type { ImportIssue, ImportIssueCode, ImportIssueSource } from '../../types';
import type { TranslateFunction } from '../CSVParser/CSVParser';
import type { ExtendedONIXMessageRoot } from './interfaces';
import type { EnvelopeEvidence, NormalizedSourceDto, OnixWorkerResult, RecoveryMarker, SourceFinding } from './validation';
import { MEGABYTE } from './validation/worker/envelope';
import { createProvenanceResolver, type ProvenanceResolver } from './validation/worker/provenance';

/**
 * The bridge from canonical ONIX source validation to the legacy target adapter (thoth-app#197).
 *
 * Canonical validation - the #190 validator, run in the browser by the #196 Worker - is the one
 * authority on the source. The target planner still reads the convenience shape `@5stones/onix`
 * parses, so that shape is parsed only once canonical validation permits continuation, and only from
 * the exact normalised Reference XML the Worker serialised from the validated (recovered) tree - never
 * from the uploaded file. Whether the adapter parses, and how it types or defaults a value, says
 * nothing about the source. The canonical result, with its findings, recovery markers and Short
 * provenance, stays beside the adapter value, unchanged.
 *
 * Only the pure modules of the Worker runtime are imported at run time: the validator itself (pinned
 * schemas, WASM) never enters the page, it runs in the Worker.
 */

/** A canonical result that permits target planning: completed, source-valid and carrying its normalised source. */
export type PermittedOnixSource = OnixWorkerResult & {
  readonly status: 'COMPLETED';
  readonly sourceValid: true;
  readonly normalized: NormalizedSourceDto;
};

export function permitsTargetPlanning(result: OnixWorkerResult): result is PermittedOnixSource {
  return result.status === 'COMPLETED' && result.sourceValid && result.normalized !== null;
}

export interface BridgedOnixSource {
  /** The canonical #196 result, retained whole: the authority on the source. */
  readonly canonical: PermittedOnixSource;
  /** Source identity of canonical elements: the original tags and paths of a Short source. */
  readonly provenance: ProvenanceResolver;
  /** The convenience target-adapter value, parsed from `canonical.normalized.xml` and nothing else. */
  readonly adapter: ExtendedONIXMessageRoot;
}

export function bridgeOnixSource(result: OnixWorkerResult): BridgedOnixSource {
  if (!permitsTargetPlanning(result)) {
    throw new Error('canonical ONIX source validation does not permit target planning for this source');
  }
  return {
    canonical: result,
    provenance: createProvenanceResolver(result.normalized.provenance),
    adapter: parse(result.normalized.xml) as ExtendedONIXMessageRoot,
  };
}

const SCOPE_CODES: Readonly<Record<SourceFinding['scope'], ImportIssueCode>> = {
  VALIDITY: 'onix.source.validity',
  SUPPORT: 'onix.source.support',
  SECURITY: 'onix.source.security',
};

/** The Product a canonical path lies in, numbered from 1 as the target planner numbers Products; else the file. */
function issueSource(path: string | null | undefined): ImportIssueSource {
  const product = path ? /^\/ONIXMessage\[1\]\/Product\[(\d+)\]/.exec(path) : null;
  return product ? { kind: 'onix', productIndex: Number(product[1]) } : { kind: 'file' };
}

/** Where a finding points: its canonical path, after the original path when a Short source named it differently. */
function location(path: string | null | undefined, sourcePath: string | null | undefined, t: TranslateFunction) {
  if (!path) return '';
  return sourcePath && sourcePath !== path
    ? t('onixValidation.issue.locationShort', { sourcePath, path })
    : t('onixValidation.issue.location', { path });
}

/** How a finding stands in the verdict when it does not simply count toward it. */
function disposition(finding: SourceFinding): string | null {
  if (finding.recoverability !== 'NOT_RECOVERABLE') return finding.recoverability;
  if (finding.projection !== 'AUTHORITATIVE') return finding.projection;
  return finding.counts ? null : 'NON_BLOCKING';
}

function findingIssue(finding: SourceFinding, t: TranslateFunction): ImportIssue {
  const kept = disposition(finding);
  return {
    // Only an authoritative, unrecovered finding of a blocking class counts toward the source's verdict.
    severity: finding.counts ? 'error' : 'warning',
    code: SCOPE_CODES[finding.scope],
    message: t('onixValidation.issue.finding', {
      scope: t(`onixValidation.issue.${finding.scope}`),
      message: finding.message || finding.class,
      id: finding.id,
      findingClass: finding.class,
      location: location(finding.path, finding.sourcePath, t),
      disposition: kept ? t(`onixValidation.disposition.${kept}`) : '',
    }),
    source: issueSource(finding.path),
    sourceValidation: { kind: 'finding', finding },
  };
}

function recoveryIssue(
  recovery: RecoveryMarker,
  provenance: ProvenanceResolver | null,
  t: TranslateFunction,
): ImportIssue {
  return {
    severity: 'warning',
    code: 'onix.source.recovered',
    message: t('onixValidation.issue.recovered', {
      location: location(recovery.removed, provenance?.sourcePathOf(recovery.removed), t),
      recovery: recovery.recovery,
    }),
    source: issueSource(recovery.removed),
    sourceValidation: { kind: 'recovery', recovery },
  };
}

/**
 * Every canonical finding in ledger order, then every approved recovery, as upload issues. Nothing is
 * dropped, merged or reclassified: each issue carries its finding or recovery marker whole, and its
 * code keeps the source's validity, Thoth's support for it and the security boundary apart.
 */
export function projectOnixSourceIssues(result: OnixWorkerResult, t: TranslateFunction): ImportIssue[] {
  const provenance = result.normalized ? createProvenanceResolver(result.normalized.provenance) : null;
  return [
    ...result.findings.map((finding) => findingIssue(finding, t)),
    ...(result.normalized?.recoveries ?? []).map((recovery) => recoveryIssue(recovery, provenance, t)),
  ];
}

/** Why this browser cannot validate the source: a support outcome, never a finding about the source. */
function refusalMessage(envelope: EnvelopeEvidence, t: TranslateFunction): string {
  if (envelope.verdict === 'REFUSE' && envelope.limits) {
    return t('onixValidation.support.tooLarge', {
      engine: t(`onixValidation.engine.${envelope.engine}`),
      exceeded: envelope.exceeded.map((dimension) => t(`onixValidation.warning.dimension.${dimension}`)),
      limitMegabytes: envelope.limits.warning.bytes / MEGABYTE,
      limitProducts: envelope.limits.warning.products,
    });
  }
  const engine = envelope.engine === 'mobile' || envelope.engine === 'webkit' ? envelope.engine : 'unknown';
  return t(`onixValidation.support.${engine}`);
}

/** A refused source (engine unsupported, or beyond this engine's envelope): one SUPPORT issue, no fallback. */
export function projectOnixRefusal(envelope: EnvelopeEvidence, t: TranslateFunction): ImportIssue[] {
  return [
    {
      severity: 'error',
      code: 'onix.source.support',
      message: refusalMessage(envelope, t),
      source: { kind: 'file' },
      sourceValidation: { kind: 'support', envelope },
    },
  ];
}

/** Validation never reached an outcome (the Worker failed or reported an internal error): nothing was checked. */
export function projectOnixUnavailable(
  failure: { readonly code: string; readonly message: string },
  t: TranslateFunction,
): ImportIssue[] {
  return [
    {
      severity: 'error',
      code: 'onix.source.unavailable',
      message: t('onixValidation.unavailable', { detail: failure.message || failure.code }),
      source: { kind: 'file' },
      sourceValidation: { kind: 'unavailable', code: failure.code, message: failure.message },
    },
  ];
}
