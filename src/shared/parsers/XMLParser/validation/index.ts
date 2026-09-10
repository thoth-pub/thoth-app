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
  type NormalizedOnixSource,
  type OnixSourceValidationResult,
  type OnixSourceValidationSummary,
  type OnixSourceValidator,
  type OnixSourceValidatorOptions,
} from './validator';
