import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

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
import {
  type BridgedOnixSource,
  bridgeOnixSource,
  permitsTargetPlanning,
  projectOnixSourceIssues,
} from '../onixSourceBridge';
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
import type { OnixRegressionTargetState, OnixTargetRead } from './types';

/**
 * The ONIX import pipeline as the live uploader runs it, for regression fixtures (thoth-app#236).
 *
 * The stages are the exported contract functions `XMLParse.tsx` composes, called in the same order with the same
 * arguments: canonical source validation as a Worker session runs it, the source gate, the bridge to the normalised
 * Reference source, every reduction, exact target resolution, the target adapter and the resolver. Only what lies
 * outside the file is stood in for, deterministically: the pinned standards resources are read from `public/`, and
 * Thoth is an empty publisher whose lookups find nothing - or, for an existing-target scenario (thoth-app#250), a Thoth
 * that answers exactly the reads the scenario states. Nothing is executed and nothing is written.
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

/**
 * What lies outside the file for one planning run: the four authoritative lookup interfaces the uploader plans with,
 * and the check that the run asked Thoth exactly what its target state says it does.
 */
export type OnixRegressionEnvironment = {
  readonly targetLookup: OnixTargetLookup;
  readonly relatedLookup: OnixRelatedMaterialLookup;
  readonly contributorService: ContributorService;
  readonly institutionService: InstitutionService;
  /** Every read the run made, in the order it made them. */
  readonly made: readonly OnixTargetRead[];
  /**
   * Throws unless every read the target state states was made and no other was asked for. A refused request fails the
   * run here even when the planner caught the throw itself: the adapter reports any error as a failed parse.
   */
  readonly settle: () => void;
};

type ReadOf<M extends OnixTargetRead['method']> = Extract<OnixTargetRead, { method: M }>;

/** A copy of what Thoth returns, so no run can change what the scenario states for the next one. */
const returned = <T>(value: T): T => structuredClone(value);

/**
 * A Thoth holding exactly what the stated reads return (thoth-app#250). Each lookup answers only a request a stated read
 * names exactly - the same method, the same arguments, the active publisher for a publisher-scoped one - and only once.
 * Any other request fails the run: these stand-ins decide nothing about identity, matching or compatibility, which
 * stay the planner's own, and never answer a question the scenario did not anticipate.
 */
const existingTargetEnvironment = (
  reads: readonly OnixTargetRead[],
  publisherId: string,
): OnixRegressionEnvironment => {
  const pending = reads.map((read) => ({ read, made: false }));
  const made: OnixTargetRead[] = [];
  const refused: string[] = [];
  const take = <M extends OnixTargetRead['method']>(
    method: M,
    request: Readonly<Record<string, unknown>>,
    answers: (read: ReadOf<M>) => boolean,
  ): ReadOf<M> => {
    const entry = pending.find(({ read, made: done }) => !done && read.method === method && answers(read as ReadOf<M>));

    if (entry === undefined) {
      refused.push(`${method} ${JSON.stringify(request)}`);
      throw new Error(
        `the existing-target scenario states no ${method} read for ${JSON.stringify(request)}: an unexpected lookup`,
      );
    }
    entry.made = true;
    made.push(entry.read);

    return entry.read as ReadOf<M>;
  };
  const same = (a: unknown, b: unknown) => isDeepStrictEqual(a, b);
  const byKey = <T>(matches: Readonly<Record<string, readonly T[]>>) =>
    new Map(Object.entries(matches).map(([key, works]) => [key, returned([...works])]));

  return {
    targetLookup: {
      findWorks: async (identifiers) =>
        byKey(
          take(
            'findWorks',
            { publisherId, identifiers },
            (read) => read.publisherId === publisherId && same([...read.identifiers], [...identifiers]),
          ).matches,
        ),
      getWork: async (workId) => returned(take('getWork', { workId }, (read) => read.workId === workId).work),
    },
    relatedLookup: {
      findWorksGlobally: async (identifiers) =>
        byKey(
          take('findWorksGlobally', { identifiers }, (read) => same([...read.identifiers], [...identifiers])).matches,
        ),
      getWorkRelations: async (workId) =>
        returned([...take('getWorkRelations', { workId }, (read) => read.workId === workId).relations]),
      getWorkReferences: async (workId) =>
        returned([...take('getWorkReferences', { workId }, (read) => read.workId === workId).references]),
    },
    contributorService: {
      getContributorsByOrcids: async (orcids: string[]) =>
        returned([
          ...take('getContributorsByOrcids', { orcids }, (read) => same([...read.orcids], [...orcids])).contributors,
        ]),
      getContributors: async (filter: string) =>
        returned([...take('getContributors', { filter }, (read) => read.filter === filter).contributors]),
    } as unknown as ContributorService,
    institutionService: {
      getInstitutions: async (offset: number, limit: number, filter: string) =>
        returned([
          ...take(
            'getInstitutions',
            { offset, limit, filter },
            (read) => read.offset === offset && read.limit === limit && read.filter === filter,
          ).institutions,
        ]),
    } as unknown as InstitutionService,
    made,
    settle: () => {
      const unmade = pending.filter(({ made: done }) => !done).map(({ read }) => read.method);

      if (refused.length > 0) {
        throw new Error(`the planner made lookups the existing-target scenario does not state: ${refused.join('; ')}`);
      }
      if (unmade.length > 0) {
        throw new Error(`the existing-target scenario states reads the planner never made: ${unmade.join(', ')}`);
      }
    },
  };
};

/**
 * The lookups a run plans with: the empty publisher's, which find nothing and read nothing, or exactly the stated reads
 * of an existing-target state, scoped to the active publisher.
 */
export const regressionEnvironment = (
  target: OnixRegressionTargetState,
  publisherId: string = ONIX_REGRESSION_PUBLISHER_ID,
): OnixRegressionEnvironment =>
  target === 'EMPTY_PUBLISHER'
    ? {
        targetLookup: EMPTY_PUBLISHER_LOOKUP,
        relatedLookup: EMPTY_RELATED_LOOKUP,
        contributorService: emptyContributorService(),
        institutionService: emptyInstitutionService(),
        made: [],
        settle: () => undefined,
      }
    : existingTargetEnvironment(target.reads, publisherId);

/** Source issue messages are translated for display only; the regression never reads them, so keys stand in. */
const translationKeys = (key: string) => key;

export type OnixPlanningOptions = {
  readonly imprints: readonly FormFieldOption[];
  /** The publisher's answers, over `EMPTY_ONIX_PLAN_INPUTS`. */
  readonly inputs?: Partial<OnixPlanInputs>;
  /** What Thoth already holds; the empty publisher when absent. */
  readonly target?: OnixRegressionTargetState;
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
  /** Every read of Thoth the run made, in order: none for the empty publisher. */
  readonly reads: readonly OnixTargetRead[];
};

/** Everything the uploader plans from a source the gate permitted, under one set of publisher answers. */
export const runOnixPlanning = async (
  bridged: BridgedOnixSource,
  { imprints, inputs = {}, target = 'EMPTY_PUBLISHER' }: OnixPlanningOptions,
): Promise<OnixPlanningRun> => {
  const environment = regressionEnvironment(target);
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

  const targets = await resolveOnixTargets(sourcePlan, environment.targetLookup, ONIX_REGRESSION_PUBLISHER_ID);
  const relatedMaterialTargets = await resolveOnixRelatedMaterialTargets(
    relatedMaterial,
    sourcePlan,
    targets,
    environment.relatedLookup,
  );

  const parsed = await new XMLParser(
    adapter,
    [...imprints],
    licenseOptions,
    [],
    environment.contributorService,
    environment.institutionService,
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

  environment.settle();

  if (parsed.status === 'failed' || parsed.data.onix === undefined) {
    return { ...planning, parsed, resolution: null, reads: environment.made };
  }

  const resolution = resolveOnixImportPlan({
    ...planning,
    // The canonical source findings and recoveries and the adapter's issues, bound whole into the sidecar (#186).
    issues: [...projectOnixSourceIssues(bridged.canonical, translationKeys), ...parsed.issues],
    serieses: [],
    candidatePlan: parsed.data.plan,
    adaptation: parsed.data.onix.groups,
    // What a Publication attached to an exact existing Work is materialised from (thoth-app#187).
    attachmentPublications: parsed.data.onix.attachmentPublications,
    inputs: { ...EMPTY_ONIX_PLAN_INPUTS, ...inputs },
    imprints,
  });

  return { ...planning, parsed, resolution, reads: environment.made };
};
