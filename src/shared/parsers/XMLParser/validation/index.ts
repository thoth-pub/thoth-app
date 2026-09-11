/**
 * Canonical ONIX source validation core (thoth-app#190). Not wired into the
 * live uploader: the Worker/uploader integration consumes this surface.
 */
export type {
  FindingClass,
  FindingProjection,
  FindingScope,
  FindingStage,
  FindingTier,
  Recoverability,
  SourceFinding,
} from './findings';
export { PROLOG_SCAN_BOUND } from './prolog';
export {
  loadVerifiedResource,
  ONIX_VALIDATION_RESOURCE_PATH,
  ONIX_VALIDATION_RESOURCES,
  OnixResourceIntegrityError,
  type OnixResourceLoader,
  type OnixValidationResource,
} from './resources';
export type { RecoveryMarker } from './taint';
export type { OnixFlavour, OnixRelease, OnixSchemaRelease, OnixSourceDescriptor } from './types';
export {
  createOnixSourceValidator,
  type EvaluatorControls,
  type ExecutionControls,
  type ExecutionProgress,
  type NormalizedOnixSource,
  type OnixSourceValidationResult,
  type OnixSourceValidationSummary,
  type OnixSourceValidator,
  type OnixSourceValidatorOptions,
  ValidationCancelledError,
} from './validator';
// Browser Worker runtime (thoth-app#196): inactive until the live uploader adopts it.
export {
  createOnixValidationClient,
  type OnixValidationClient,
  type OnixValidationClientOptions,
  type ProgressEvent,
  type ValidationOutcome,
  type WorkerPort,
} from './worker/client';
export { classifyEngine, ENGINE_ENVELOPES, evaluateEnvelope, MEGABYTE } from './worker/envelope';
export {
  type BeginOptions,
  type ClientToWorkerMessage,
  type EngineClass,
  type EnvelopeEvidence,
  type EnvelopeVerdict,
  type NormalizedSourceDto,
  ONIX_WORKER_PROTOCOL_VERSION,
  type OnixWorkerResult,
  type ProductCountEvidence,
  type ProvenanceDto,
  type ValidationStageName,
  type WorkerToClientMessage,
} from './worker/protocol';
export { createProvenanceResolver, type ProvenanceResolver } from './worker/provenance';
