import type { SourceFinding } from '../findings';
import type { RecoveryMarker } from '../taint';
import type { OnixSourceDescriptor } from '../types';
import type { OnixSourceValidationSummary } from '../validator';

/**
 * Worker/client protocol of the browser ONIX validation runtime (thoth-app#196).
 *
 * Every message and every field of the terminal result is plain
 * structured-clone-safe data: strings, numbers, booleans, null, arrays,
 * plain objects and one transferred `Uint8Array`. The in-process
 * `NormalizedOnixSource` of #190 (a `slimdom.Document`, function-bearing
 * provenance, `serialize()`) never crosses this boundary; the Worker
 * serialises the canonical tree itself and ships a deterministic provenance
 * sidecar instead.
 */
export const ONIX_WORKER_PROTOCOL_VERSION = 1;

/** Desktop engine classes of the approved envelope policy (thoth#895 final decision). */
export type EngineClass = 'chromium' | 'gecko' | 'webkit' | 'mobile' | 'unknown';

export type EnvelopeVerdict = 'NORMAL' | 'WARNING' | 'REFUSE' | 'UNSUPPORTED';

/** Namespace-aware Product start-tag count, or the reason it was not measured. */
export type ProductCountEvidence =
  | { readonly measured: true; readonly count: number }
  | {
      readonly measured: false;
      readonly reason: 'BYTE_CEILING_EXCEEDED' | 'ENGINE_UNSUPPORTED' | 'SIZING_PARSE_ERROR';
      readonly error?: string;
    };

export interface EnvelopeLimits {
  readonly normal: { readonly bytes: number; readonly products: number };
  readonly warning: { readonly bytes: number; readonly products: number };
}

export interface EnvelopeEvidence {
  readonly engine: EngineClass;
  /** Raw source length in bytes (`Uint8Array.byteLength`), never a decoded string length. */
  readonly bytes: number;
  readonly products: ProductCountEvidence;
  readonly verdict: EnvelopeVerdict;
  /** The engine's limits, or `null` for an unsupported engine. */
  readonly limits: EnvelopeLimits | null;
  /** Dimensions above the normal threshold (WARNING) or above the ceiling (REFUSE). */
  readonly exceeded: readonly ('bytes' | 'products')[];
}

export type ProvenanceDto =
  | {
      /** Reference input: canonical names and paths are the source names and paths. */
      readonly kind: 'IDENTITY';
      readonly flavour: 'reference';
    }
  | {
      /** Short input: canonical element names map back to the source tags. */
      readonly kind: 'RENAMED';
      readonly flavour: 'short';
      readonly renamedElementCount: number;
      /** Canonical (Reference) local name -> original Short tag, for every consistently renamed name. */
      readonly referenceToSource: Readonly<Record<string, string>>;
      /** Elements whose source path or tag the map alone would not reproduce, by canonical path. */
      readonly exceptions: readonly {
        readonly path: string;
        readonly sourcePath: string;
        readonly sourceTag: string;
      }[];
    };

export interface NormalizedSourceDto {
  /** Canonical Reference XML serialised inside the Worker from the exact validated (recovered) tree. */
  readonly xml: string;
  readonly elementCount: number;
  readonly recoveries: readonly RecoveryMarker[];
  readonly provenance: ProvenanceDto;
}

/** Structured-clone-safe projection of `OnixSourceValidationResult`. */
export interface OnixWorkerResult {
  readonly status: 'STOPPED' | 'COMPLETED';
  readonly stop: { readonly stage: 1 | 2; readonly text: string } | null;
  readonly source: OnixSourceDescriptor | null;
  readonly findings: readonly SourceFinding[];
  readonly summary: OnixSourceValidationSummary;
  readonly sourceValid: boolean;
  readonly normalized: NormalizedSourceDto | null;
}

export type ValidationStageName =
  | 'DECODING'
  | 'SOURCE_GATE'
  | 'SIZING'
  | 'ENVELOPE'
  | 'PREPARING'
  | 'ORDINARY'
  | 'STRICT'
  | 'SCHEMATRON'
  | 'INVENTORY'
  | 'PROJECTION'
  | 'SERIALIZING';

export interface BeginOptions {
  /** Evidence-backed fast paths (A1-A8, G1, S1) with canonical fallback; `false` runs the canonical evaluators only. */
  readonly accelerate?: boolean;
  /** Emit progress messages. The final result is identical either way. */
  readonly progress?: boolean;
}

export type ClientToWorkerMessage =
  | { readonly type: 'begin'; readonly runId: string; readonly bytes: Uint8Array; readonly options?: BeginOptions }
  | { readonly type: 'continue'; readonly runId: string; readonly token: string }
  | { readonly type: 'cancel'; readonly runId: string };

export type WorkerErrorCode = 'BUSY' | 'NO_SESSION' | 'STALE_SESSION' | 'MALFORMED_MESSAGE' | 'INTERNAL';

export type WorkerToClientMessage =
  | {
      readonly type: 'ready';
      readonly protocolVersion: number;
      readonly engine: EngineClass;
      readonly userAgent: string;
    }
  | {
      readonly type: 'progress';
      readonly runId: string;
      readonly stage: ValidationStageName;
      readonly done?: number;
      readonly total?: number;
    }
  | { readonly type: 'warning'; readonly runId: string; readonly token: string; readonly envelope: EnvelopeEvidence }
  | {
      readonly type: 'refused';
      readonly runId: string;
      readonly reason: 'UNSUPPORTED_FOR_BROWSER_VALIDATION';
      readonly scope: 'SUPPORT';
      readonly envelope: EnvelopeEvidence;
    }
  | {
      readonly type: 'result';
      readonly runId: string;
      readonly result: OnixWorkerResult;
      readonly envelope: EnvelopeEvidence | null;
    }
  | { readonly type: 'cancelled'; readonly runId: string; readonly stage: ValidationStageName | null }
  | { readonly type: 'error'; readonly runId: string | null; readonly code: WorkerErrorCode; readonly message: string };
