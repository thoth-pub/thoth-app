import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ContributorService } from '@/src/entities/contributor';
import type { InstitutionService } from '@/src/entities/institution';
import type { FormFieldOption } from '@/src/shared/interfaces';
import type {
  OnixAccessibilityPlan,
  OnixCollateralPlan,
  OnixCommercialPlan,
  OnixComponentPlan,
  OnixPlanInputs,
  OnixRelatedMaterialPlan,
  OnixRelatedMaterialTargetEvidence,
  OnixReviewsPrizesPlan,
  OnixRightsPlan,
  OnixSalesRightsPlan,
  OnixSourcePlan,
  OnixTargetEvidence,
} from '@/src/shared/types/onixPlanning';
import type { ImportParseResult } from '@/src/shared/types/parsers';

import { currencyOptions, languageOptions, licenseOptions } from '../../../constants';
import { reduceOnixAccessibility } from '../onixAccessibility';
import { reduceOnixCollateral } from '../onixCollateral';
import { reduceOnixCommercial } from '../onixCommercial';
import { reduceOnixComponents } from '../onixComponents';
import { type OnixDescriptivePlan, reduceOnixDescriptive } from '../onixDescriptive';
import { planOnixSource } from '../onixPlanning';
import {
  type OnixRelatedMaterialLookup,
  reduceOnixRelatedMaterial,
  resolveOnixRelatedMaterialTargets,
} from '../onixRelations';
import { reduceOnixReviewsPrizes } from '../onixReviewsPrizes';
import { reduceOnixRights } from '../onixRights';
import { reduceOnixSalesRights } from '../onixSalesRights';
import { type BridgedOnixSource, bridgeOnixSource, permitsTargetPlanning } from '../onixSourceBridge';
import {
  adaptableGroupKeys,
  EMPTY_ONIX_PLAN_INPUTS,
  type OnixResolvedImportPlan,
  type OnixTargetLookup,
  resolveOnixImportPlan,
  resolveOnixTargets,
} from '../onixTargetResolution';
import { createOnixSourceValidator, type OnixSourceValidator, type OnixWorkerResult } from '../validation';
import { createExecutionControls } from '../validation/worker/execution';
import { toWorkerResult } from '../validation/worker/result';
import XMLParser from '../XMLParser';

/**
 * The ONIX import pipeline as the live uploader runs it, for regression fixtures (thoth-app#236).
 *
 * The stages are the exported contract functions `XMLParse.tsx` composes, called in the same order with the same
 * arguments: canonical source validation as a Worker session runs it, the source gate, the bridge to the normalised
 * Reference source, every reduction, exact target resolution, the target adapter and the resolver. Only what lies
 * outside the file is stood in for, deterministically: the pinned standards resources are read from `public/`, and
 * Thoth is an empty publisher whose lookups find nothing. Nothing is executed and nothing is written.
 *
 * This module owns no semantics. If `XMLParse.tsx` changes how it composes the stages, this runner must change with
 * it; a fixture then fails rather than silently proving a pipeline the uploader no longer runs.
 */

/** The active publisher every lookup is scoped to. It holds nothing. */
export const ONIX_REGRESSION_PUBLISHER_ID = '00000000-0000-4000-8000-000000000236';

const PUBLIC_DIR = join(process.cwd(), 'public', 'onix-validation');

const noop = () => undefined;

let validator: OnixSourceValidator | null = null;

/**
 * One validator per test process, as a Worker session builds it: the pinned resources, and the accelerated
 * evaluators a session runs unless told otherwise (whose findings the canonical ones must equal, in order).
 */
const sourceValidator = (): OnixSourceValidator => {
  validator ??= createOnixSourceValidator({
    loadResource: async (fileName) => new Uint8Array(readFileSync(join(PUBLIC_DIR, fileName))),
    execution: createExecutionControls({
      accelerate: true,
      onStage: noop,
      onProgress: noop,
      shouldCancel: () => false,
      yield: () => Promise.resolve(),
    }),
  });

  return validator;
};

export type OnixGateRun = {
  /** Exactly what a Worker session posts for these bytes. */
  readonly result: OnixWorkerResult;
  /** `permitsTargetPlanning`: whether the uploader lets the target side see this source at all. */
  readonly permitted: boolean;
  /** The normalised source and adapter value the target side reads; null when the gate refuses. */
  readonly bridged: BridgedOnixSource | null;
};

/** Canonical source validation and the source gate, over the uploaded bytes and nothing else. */
export const runOnixSourceGate = async (bytes: Uint8Array): Promise<OnixGateRun> => {
  const result = toWorkerResult(await sourceValidator().validate(bytes));
  const permitted = permitsTargetPlanning(result);

  return { result, permitted, bridged: permitted ? bridgeOnixSource(result) : null };
};

/** A Thoth holding none of the file's identifiers: every Work group is a new Work, and no existing Work is read. */
const EMPTY_PUBLISHER_LOOKUP: OnixTargetLookup = {
  findWorks: async () => new Map(),
  getWork: async (workId) => {
    throw new Error(`the empty regression publisher holds no Work ${workId}`);
  },
};

/** A Thoth holding no Work any relation endpoint names, in any publisher. */
const EMPTY_RELATED_LOOKUP: OnixRelatedMaterialLookup = {
  findWorksGlobally: async () => new Map(),
  getWorkRelations: async (workId) => {
    throw new Error(`the empty regression publisher resolves no existing Work ${workId}`);
  },
  getWorkReferences: async (workId) => {
    throw new Error(`the empty regression publisher resolves no existing Work ${workId}`);
  },
};

/** Contributor and Institution lookups that find nothing: every contributor and institution is new. */
const emptyContributorService = () =>
  ({
    getContributors: async () => [],
    getContributorsByOrcids: async () => [],
  }) as unknown as ContributorService;

const emptyInstitutionService = () => ({ getInstitutions: async () => [] }) as unknown as InstitutionService;

export type OnixPlanningOptions = {
  readonly imprints: readonly FormFieldOption[];
  /** The publisher's answers, over `EMPTY_ONIX_PLAN_INPUTS`. */
  readonly inputs?: Partial<OnixPlanInputs>;
};

export type OnixPlanningRun = {
  readonly sourcePlan: OnixSourcePlan;
  readonly descriptive: OnixDescriptivePlan;
  readonly rights: OnixRightsPlan;
  readonly commercial: OnixCommercialPlan;
  readonly salesRights: OnixSalesRightsPlan;
  readonly accessibility: OnixAccessibilityPlan;
  readonly components: OnixComponentPlan;
  readonly relatedMaterial: OnixRelatedMaterialPlan;
  readonly collateral: OnixCollateralPlan;
  readonly reviewsPrizes: OnixReviewsPrizesPlan;
  readonly targets: OnixTargetEvidence;
  readonly relatedMaterialTargets: OnixRelatedMaterialTargetEvidence;
  /** What the target adapter made of the Work groups the evidence leaves new. */
  readonly parsed: ImportParseResult;
  /** The resolver's plan under the given inputs; null when the adapter itself failed, as the uploader stops there. */
  readonly resolution: OnixResolvedImportPlan | null;
};

/** Everything the uploader plans from a source the gate permitted, under one set of publisher answers. */
export const runOnixPlanning = async (
  bridged: BridgedOnixSource,
  { imprints, inputs = {} }: OnixPlanningOptions,
): Promise<OnixPlanningRun> => {
  const { adapter, provenance } = bridged;
  const { recoveries, xml: normalizedXml } = bridged.canonical.normalized;

  const sourcePlan = planOnixSource(adapter, { provenance });
  const descriptive = reduceOnixDescriptive(adapter, sourcePlan, { provenance, recoveries });
  const rights = reduceOnixRights(adapter, sourcePlan, { provenance });
  const commercial = reduceOnixCommercial(adapter, sourcePlan, { provenance, normalizedXml });
  // The uploader compares accessibility request contacts with the publisher's own only when it has any; the empty
  // regression publisher has none, so the reduction runs once, as it does for such a publisher.
  const salesRights = reduceOnixSalesRights(adapter, sourcePlan, { provenance, commercial });
  const accessibility = reduceOnixAccessibility(adapter, sourcePlan, { provenance, rights });
  const components = reduceOnixComponents(adapter, sourcePlan, { provenance });
  const relatedMaterial = reduceOnixRelatedMaterial(adapter, sourcePlan, { provenance });
  const collateral = reduceOnixCollateral(adapter, sourcePlan, { provenance, recoveries, descriptive });
  const reviewsPrizes = reduceOnixReviewsPrizes(adapter, sourcePlan, collateral, { provenance });

  const targets = await resolveOnixTargets(sourcePlan, EMPTY_PUBLISHER_LOOKUP, ONIX_REGRESSION_PUBLISHER_ID);
  const relatedMaterialTargets = await resolveOnixRelatedMaterialTargets(
    relatedMaterial,
    sourcePlan,
    targets,
    EMPTY_RELATED_LOOKUP,
  );

  const parsed = await new XMLParser(
    adapter,
    [...imprints],
    licenseOptions,
    [],
    emptyContributorService(),
    emptyInstitutionService(),
    languageOptions,
    currencyOptions,
    {
      sourcePlan,
      descriptive,
      components,
      collateral,
      adaptGroupKeys: adaptableGroupKeys(sourcePlan, targets, imprints),
    },
  ).parse();

  const planning = {
    sourcePlan,
    descriptive,
    rights,
    commercial,
    salesRights,
    accessibility,
    components,
    relatedMaterial,
    collateral,
    reviewsPrizes,
    targets,
    relatedMaterialTargets,
  };

  if (parsed.status === 'failed' || parsed.data.onix === undefined) return { ...planning, parsed, resolution: null };

  const resolution = resolveOnixImportPlan({
    ...planning,
    serieses: [],
    candidatePlan: parsed.data.plan,
    adaptation: parsed.data.onix.groups,
    inputs: { ...EMPTY_ONIX_PLAN_INPUTS, ...inputs },
    imprints,
  });

  return { ...planning, parsed, resolution };
};
