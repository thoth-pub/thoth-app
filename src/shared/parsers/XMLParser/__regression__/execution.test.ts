// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AbstractService } from '@/src/entities/abstract/api/abstract.service';
import { AffiliationService } from '@/src/entities/affiliation/api/affiliation.service';
import { ContributionService } from '@/src/entities/contribution/api/contribution.service';
import { ContributorService } from '@/src/entities/contributor/api/contributor.service';
import { FundingService } from '@/src/entities/funding/api/funding.service';
import { LanguageService } from '@/src/entities/language/api/language.service';
import { LocationService } from '@/src/entities/locations/api/location.service';
import { PriceService } from '@/src/entities/price/api/price.service';
import { PublicationService } from '@/src/entities/publication/api/publication.service';
import { CREATE_PUBLICATION } from '@/src/entities/publication/model/publication.schema';
import { ReferenceService } from '@/src/entities/reference/api/reference.service';
import { SeriesService } from '@/src/entities/series/api/series.service';
import { SubjectService } from '@/src/entities/subject/api/subject.service';
import { TitleService } from '@/src/entities/title/api/title.service';
import { WorkService } from '@/src/entities/work/api/work.service';
import { ImportExecutionError } from '@/src/entities/work/model/import-execution.error';
import { DELETE_WORK, GET_WORK } from '@/src/entities/work/model/work.schema';
import { GraphqlError, type GraphqlService } from '@/src/shared/api/graphqlService';
import { appConfig } from '@/src/shared/config';
import { FileStorage } from '@/src/shared/services/FileStorage/FileStorage';
import type {
  ImportCleanupDisposition,
  ImportExecutionFailure,
  ImportExecutionProgress,
  ImportPlan,
  ImportSource,
} from '@/src/shared/types';
import type { OnixPlanInputs } from '@/src/shared/types/onixPlanning';
import { buildImportPreflightReport } from '@/src/shared/utils/importPreflight';
import { deriveImportLedger } from '@/src/widgets/AllWorks/lib/importLedger';
import { buildImportReport } from '@/src/widgets/AllWorks/lib/importReport';

import { runOnixRegressionFixture } from './assertions';
import existingConflict from './fixtures/existing-target-conflict/expected';
import existingEnrichment from './fixtures/existing-target-enrichment/expected';
import existingNoop from './fixtures/existing-target-noop/expected';
import collateral from './fixtures/target-collateral-resources/expected';
import components from './fixtures/target-components-hierarchy/expected';
import licence from './fixtures/target-licence-usage-protection/expected';
import reviews from './fixtures/target-reviews-prizes-cited-content/expected';
import subjects from './fixtures/target-subject-matrix/expected';
import supply from './fixtures/target-supply-prices-locations/expected';
import { onixFixtureSource } from './fixtureSources';
import type { OnixPlanningRun } from './pipeline';
import type { OnixExistingTargetState, OnixRegressionFixture } from './types';

/**
 * The execution surface of the ONIX contract regression suite (thoth-app#250): a real confirmed plan, resolved by the
 * pipeline the uploader runs from a registered fixture, executed by the production execution services - `WorkService`,
 * `PublicationService` and every child service, wired as the app wires them - over one adversarial GraphQL transport.
 *
 * The transport stands in for the Thoth API and nothing else. It records every operation and its exact variables, in
 * order; answers each create with a deterministic id and the shape the generated document selects; refuses any query
 * (a confirmed plan is executed without reading Thoth), any operation the import does not send, any id it did not mint
 * and the scenario does not hold, any placeholder id, and any delete of something this run did not create; and fails a
 * chosen write the way the API would. A refusal fails the test even when the production code caught the throw. Nothing
 * here decides an outcome: every expectation is a value the confirmed plan or its fixture's contract states.
 *
 * Contract authority: the aggregate preflight and the immutable confirmed plan (#186); the execution units, stage order,
 * attempt-local journal, compensation and retry dispositions (#187, CR-1, CR-2, D1, D2); the session ledger and report
 * (#103, #105, #187). The file is never atomic across units.
 */

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

/* ------------------------------------------------------------------------------------------------ */
/* The adversarial GraphQL transport                                                                 */
/* ------------------------------------------------------------------------------------------------ */

type Variables = Readonly<Record<string, unknown>>;

/**
 * One request the services sent, the execution unit that was current when they sent it, and the id it created, if
 * any.
 */
type TransportCall = {
  readonly operation: string;
  readonly variables: Variables;
  readonly unit: number;
  created?: string;
};

/** How the API answers one write it is told to fail: an error, a create that names nothing, a delete of another id. */
type Fault = 'THROW' | 'NO_ID' | 'WRONG_ID';

/** The writes a scenario makes fail: by operation and occurrence (1-based) within the run. */
type Faults = Readonly<Record<string, Readonly<Record<number, Fault>>>>;

/** Every create a confirmed ONIX plan sends, by the root field and id field its generated document selects. */
const CREATES: Readonly<Record<string, { readonly field: string; readonly id: string }>> = {
  CreateWork: { field: 'createWork', id: 'workId' },
  CreateTitle: { field: 'createTitle', id: 'titleId' },
  CreateAbstract: { field: 'createAbstract', id: 'abstractId' },
  CreateSubject: { field: 'createSubject', id: 'subjectId' },
  CreateFunding: { field: 'createFunding', id: 'fundingId' },
  CreateContributor: { field: 'createContributor', id: 'contributorId' },
  CreateContribution: { field: 'createContribution', id: 'contributionId' },
  CreateBiography: { field: 'createBiography', id: 'biographyId' },
  CreateAffiliation: { field: 'createAffiliation', id: 'affiliationId' },
  CreateLanguage: { field: 'createLanguage', id: 'languageId' },
  CreateReference: { field: 'createReference', id: 'referenceId' },
  CreatePublication: { field: 'createPublication', id: 'publicationId' },
  CreatePrice: { field: 'createPrice', id: 'priceId' },
  CreateLocation: { field: 'createLocation', id: 'locationId' },
  CreateWorkRelation: { field: 'createWorkRelation', id: 'workRelationId' },
  CreateAdditionalResource: { field: 'createAdditionalResource', id: 'workResourceId' },
  CreateBookReview: { field: 'createBookReview', id: 'bookReviewId' },
  CreateEndorsement: { field: 'createEndorsement', id: 'endorsementId' },
  CreateAward: { field: 'createAward', id: 'awardId' },
  CreateSeries: { field: 'createSeries', id: 'seriesId' },
  CreateIssue: { field: 'createIssue', id: 'issueId' },
};

/** The creates whose documents select only the id (and the Work it is under), not the entity they create. */
const ID_ONLY = new Set(['CreateContribution', 'CreateWorkRelation', 'CreateSeries', 'CreateIssue']);

/** The only deletes an ONIX execution unit's compensation sends (#187), by root field, id field and variable. */
const DELETES: Readonly<Record<string, { readonly field: string; readonly id: string; readonly variable: string }>> = {
  DeleteWork: { field: 'deleteWork', id: 'workId', variable: 'workId' },
  DeletePublication: { field: 'deletePublication', id: 'publicationId', variable: 'publicationId' },
  DeleteWorkRelation: { field: 'deleteWorkRelation', id: 'workRelationId', variable: 'workRelationId' },
  DeleteAdditionalResource: {
    field: 'deleteAdditionalResource',
    id: 'workResourceId',
    variable: 'additionalResourceId',
  },
  DeleteBookReview: { field: 'deleteBookReview', id: 'bookReviewId', variable: 'bookReviewId' },
  DeleteEndorsement: { field: 'deleteEndorsement', id: 'endorsementId', variable: 'endorsementId' },
  DeleteAward: { field: 'deleteAward', id: 'awardId', variable: 'awardId' },
};

const operationOf = (document: unknown): string =>
  (document as { definitions: { kind: string; name?: { value: string } }[] }).definitions.find(
    ({ kind }) => kind === 'OperationDefinition',
  )?.name?.value ?? 'UNNAMED';

/** Every value at a key naming an id (`workId`, `publicationId`, `institutionId`, ...), anywhere in the variables. */
const idsOf = (value: unknown): string[] => {
  if (value === null || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) =>
    /Id$/.test(key) && typeof child === 'string' && child.length > 0 ? [child] : idsOf(child),
  );
};

/** Every string anywhere in a value. */
const stringsOf = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(stringsOf);

  return [];
};

class AdversarialTransport {
  readonly calls: TransportCall[] = [];

  /** Every way the services broke the API contract; a test fails on any, whoever caught the throw. */
  readonly violations: string[] = [];

  /** Every id this run created, and the unit that created it. */
  readonly minted = new Map<string, { readonly operation: string; readonly unit: number }>();

  /** The execution unit the services are working on, as the run's own progress readings say. */
  unit = 0;

  private sequence = 0;

  private readonly occurrences = new Map<string, number>();

  /**
   * `holds`: the ids the scenario's Thoth already holds. `faults`: the writes the API fails. `script`, when given: the
   * exact operations the run must send, in order - any other operation at any position is refused as it is sent.
   */
  constructor(
    private readonly holds: ReadonlySet<string>,
    private readonly faults: Faults = {},
    private readonly script?: readonly string[],
  ) {}

  readonly query = async (document: unknown, variables: Variables): Promise<never> => {
    this.calls.push({ operation: operationOf(document), variables: structuredClone(variables), unit: this.unit });

    throw this.violate(`a confirmed plan was executed by reading Thoth through ${operationOf(document)}`);
  };

  readonly mutation = async (document: unknown, variables: Variables): Promise<unknown> => {
    const operation = operationOf(document);
    const call: TransportCall = { operation, variables: structuredClone(variables), unit: this.unit };
    const occurrence = (this.occurrences.get(operation) ?? 0) + 1;

    this.calls.push(call);
    this.occurrences.set(operation, occurrence);

    if (this.script !== undefined && this.script[this.calls.length - 1] !== operation) {
      throw this.violate(
        `${operation} sent at position ${this.calls.length}, where the run sends ${this.script[this.calls.length - 1] ?? 'nothing'}`,
      );
    }
    if (CREATES[operation] === undefined && DELETES[operation] === undefined) {
      throw this.violate(`${operation} is not an operation a confirmed ONIX plan sends`);
    }
    if (stringsOf(variables).includes(appConfig.defaultId)) {
      throw this.violate(`${operation} sent the placeholder id ${appConfig.defaultId}`);
    }

    const unknown = idsOf(variables).filter((id) => !this.minted.has(id) && !this.holds.has(id));

    if (unknown.length > 0)
      throw this.violate(`${operation} names ids neither created nor held: ${unknown.join(', ')}`);

    const fault = this.faults[operation]?.[occurrence];

    if (fault === 'THROW') throw new GraphqlError(`${operation} failed at the API`);

    const deletion = DELETES[operation];

    if (deletion !== undefined) {
      const target = variables[deletion.variable] as string;

      if (!this.minted.has(target)) throw this.violate(`${operation} deletes ${target}, which this run never created`);

      const answer = fault === 'NO_ID' ? null : fault === 'WRONG_ID' ? `${target}~other` : target;

      return { [deletion.field]: answer === null ? null : { [deletion.id]: answer } };
    }

    const { field, id: idField } = CREATES[operation];
    const data = (variables.data ?? {}) as Readonly<Record<string, unknown>>;

    this.sequence += 1;
    const id = `${field.slice('create'.length).toLowerCase()}-${this.sequence}`;

    if (fault === 'NO_ID')
      return { [field]: ID_ONLY.has(operation) ? { [idField]: null } : { ...data, [idField]: null } };

    this.minted.set(id, { operation, unit: this.unit });
    call.created = id;

    if (operation === 'CreatePublication') {
      return {
        [field]: {
          publicationId: id,
          work: { doi: null, titles: [], imprint: { publisher: { publisherName: 'Regression Press' } } },
          prices: [],
        },
      };
    }
    if (operation === 'CreateAffiliation') {
      return { [field]: { ...data, affiliationId: id, institution: { institutionName: '', ror: null } } };
    }

    return { [field]: ID_ONLY.has(operation) ? { [idField]: id, workId: data.workId } : { ...data, [idField]: id } };
  };

  /** The operations sent, in order. */
  operations(): string[] {
    return this.calls.map(({ operation }) => operation);
  }

  /** The variables of every call of one operation, in order. */
  sent(operation: string): Variables[] {
    return this.calls.filter((call) => call.operation === operation).map(({ variables }) => variables);
  }

  private violate(message: string): Error {
    this.violations.push(message);

    return new Error(`transport contract violated: ${message}`);
  }
}

/** The production services a bulk import executes through, wired as the app's services context wires them. */
const productionServices = (transport: AdversarialTransport) => {
  const graphqlService = transport as unknown as GraphqlService;
  const contributorService = new ContributorService(graphqlService);
  const publicationService = new PublicationService({
    graphqlService,
    locationService: new LocationService(graphqlService),
    priceService: new PriceService(graphqlService),
    fileStorage: new FileStorage('', graphqlService),
  });

  return new WorkService({
    graphqlService,
    fundingService: new FundingService(graphqlService),
    subjectService: new SubjectService(graphqlService),
    contributionService: new ContributionService({
      graphqlService,
      contributorService,
      affiliationService: new AffiliationService(graphqlService),
    }),
    publicationService,
    languageService: new LanguageService(graphqlService),
    seriesService: new SeriesService(graphqlService),
    referenceService: new ReferenceService(graphqlService),
    titleService: new TitleService(graphqlService),
    abstractService: new AbstractService(graphqlService),
  });
};

/* ------------------------------------------------------------------------------------------------ */
/* Real confirmed plans                                                                              */
/* ------------------------------------------------------------------------------------------------ */

/** What one registered scenario plans, through the uploader's own pipeline. */
const planningOf = async (
  fixture: OnixRegressionFixture,
  scenario: number,
  inputs?: Partial<OnixPlanInputs>,
): Promise<OnixPlanningRun> => {
  const chosen = fixture.scenarios[scenario];
  const run = await runOnixRegressionFixture(
    { ...fixture, scenarios: [inputs === undefined ? chosen : { ...chosen, inputs }] },
    onixFixtureSource(fixture),
  );

  return run.scenarios[0].run;
};

/** The confirmed plan a registered scenario offers for execution: never null where the fixture says it executes. */
const confirmedPlanOf = async (fixture: OnixRegressionFixture, scenario: number): Promise<ImportPlan> => {
  const plan = (await planningOf(fixture, scenario)).resolution?.plan ?? null;
  if (plan === null) throw new Error(`${fixture.id} scenario ${scenario} offers no plan`);

  return plan;
};

/** The `id` of every current-domain object a read returns (a Work, a Publication, a contributor, an institution). */
const readIds = (read: OnixExistingTargetState['reads'][number]): string[] => {
  const ids = (value: unknown): string[] =>
    value === null || typeof value !== 'object'
      ? []
      : Object.entries(value).flatMap(([key, child]) =>
          key === 'id' && typeof child === 'string' ? [child] : ids(child),
        );

  return ids(read);
};

/** The ids a scenario's Thoth holds: every id its stated reads return, and the publisher's imprints. */
const heldBy = (fixture: OnixRegressionFixture, scenario = 0): Set<string> => {
  const { target } = fixture.scenarios[scenario];
  const reads = target === 'EMPTY_PUBLISHER' ? [] : (target as OnixExistingTargetState).reads;

  return new Set([...fixture.imprints.map(({ value }) => value), ...idsOf(reads), ...reads.flatMap(readIds)]);
};

type Execution = {
  readonly transport: AdversarialTransport;
  readonly progress: readonly ImportExecutionProgress[];
  readonly error: ImportExecutionError | null;
};

/** Runs a confirmed plan through `WorkService.bulkCreateWorks`, as the preview's Create does, over a fresh transport. */
const execute = async (
  plan: ImportPlan,
  holds: ReadonlySet<string>,
  faults: Faults = {},
  script?: readonly string[],
): Promise<Execution> => {
  const transport = new AdversarialTransport(holds, faults, script);
  const progress: ImportExecutionProgress[] = [];
  let error: ImportExecutionError | null = null;

  try {
    await productionServices(transport).bulkCreateWorks(plan, {
      onProgress: (reading) => {
        progress.push(reading);
        transport.unit = reading.current.position;
      },
    });
  } catch (thrown) {
    if (!(thrown instanceof ImportExecutionError)) throw thrown;
    error = thrown;
  }

  return { transport, progress, error };
};

const SOURCE: ImportSource = { type: 'onix', filename: 'regression.xml' };
const OCCURRED_AT = '2026-10-07T12:00:00.000Z';

/** What the import modal derives from a stopped run: its ledger, and the report it copies or downloads. */
const accountOf = (plan: ImportPlan, error: ImportExecutionError) => {
  // An `ImportExecutionError` is the failure, whole, as `useBulkImportExecution` takes it.
  const failure: ImportExecutionFailure = { ...error.context, message: error.message };
  const ledger = deriveImportLedger(plan, { phase: 'failed', source: SOURCE, failure, occurredAt: OCCURRED_AT });
  // As `ImportExecutionStatus` hands an ONIX failure to the report builder.
  const report = buildImportReport({
    source: SOURCE,
    timestamp: OCCURRED_AT,
    ledger,
    failure: { message: failure.message, cleanup: failure.cleanup },
  });

  return { failure, ledger, report };
};

/** What a report must never claim of a non-atomic run, whatever became of the stopped unit. */
const ATOMICITY_CLAIMS = [/roll(ed)?\s?back/i, /\batomic(ally)?\b/i, /nothing was (imported|created)/i];

const expectNoAtomicityClaim = (report: string) => {
  expect(report).toContain('this import is not atomic across units');
  ATOMICITY_CLAIMS.forEach((claim) =>
    expect(report.replace('this import is not atomic across units', '')).not.toMatch(claim),
  );
};

/* ------------------------------------------------------------------------------------------------ */
/* Plans                                                                                             */
/* ------------------------------------------------------------------------------------------------ */

const EXISTING_WORK = (existingEnrichment.scenarios[1].planning.execution?.units[0].target as { workId: string })
  .workId;
const NOOP_WORK = (existingNoop.scenarios[0].planning.execution?.units[0].target as { workId: string }).workId;
const ATTACH_KEY = existingEnrichment.scenarios[1].planning.execution?.units[0].actions[0].actionKey ?? '';

/** Every write the confirmed enrichment plan sends, in order: the existing Work's unit, then the new Work's. */
const ENRICHMENT_RUN: readonly string[] = [
  // Unit 1, EXISTING_WORK: the EPUB, its Price, its canonical Location, then the other one.
  'CreatePublication',
  'CreatePrice',
  'CreateLocation',
  'CreateLocation',
  // Unit 2, NEW_WORK: the Work and what it owns - the existing contributor named, never created - then its paperback.
  'CreateWork',
  'CreateTitle',
  'CreateContribution',
  'CreateAffiliation',
  'CreateLanguage',
  'CreatePublication',
];
const NEW_WORK_KEY = existingEnrichment.scenarios[1].planning.execution?.units[1].actions[0].actionKey ?? '';

describe('REG-01E execution regression: confirmed plans through the production execution services', () => {
  let enrichment: ImportPlan;
  let noop: ImportPlan;
  let supplyPlan: ImportPlan;
  let componentsPlan: ImportPlan;
  let licencePlan: ImportPlan;
  let reviewsPlan: ImportPlan;
  let subjectsPlan: ImportPlan;
  let collateralPlan: ImportPlan;
  const fetchSpy = vi.fn(() => {
    throw new Error('the regression contacted a live API');
  });

  beforeAll(async () => {
    vi.stubGlobal('fetch', fetchSpy);
    enrichment = await confirmedPlanOf(existingEnrichment, 1);
    noop = await confirmedPlanOf(existingNoop, 0);
    supplyPlan = await confirmedPlanOf(supply, 1);
    componentsPlan = await confirmedPlanOf(components, 3);
    licencePlan = await confirmedPlanOf(licence, 1);
    reviewsPlan = await confirmedPlanOf(reviews, 1);
    subjectsPlan = await confirmedPlanOf(subjects, 1);
    collateralPlan = await confirmedPlanOf(collateral, 1);
  });

  afterAll(() => {
    // Nothing in this suite ever reached the network.
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  describe('the adversarial transport', () => {
    it('refuses a delete of a Work this run did not create - a pre-existing Work above all', async () => {
      const transport = new AdversarialTransport(new Set([EXISTING_WORK]));

      await expect(transport.mutation(DELETE_WORK, { workId: EXISTING_WORK })).rejects.toThrow(
        'which this run never created',
      );
      expect(transport.violations).toStrictEqual([`DeleteWork deletes ${EXISTING_WORK}, which this run never created`]);
    });

    it('refuses any read, any id it neither minted nor holds, and the placeholder id', async () => {
      const transport = new AdversarialTransport(new Set());

      await expect(transport.query(GET_WORK, { workId: 'w' })).rejects.toThrow('reading Thoth');
      await expect(
        transport.mutation(CREATE_PUBLICATION, { data: { workId: 'a-plan-local-id', publicationType: 'PDF' } }),
      ).rejects.toThrow('neither created nor held');
      await expect(
        transport.mutation(CREATE_PUBLICATION, { data: { workId: appConfig.defaultId, publicationType: 'PDF' } }),
      ).rejects.toThrow('placeholder');
      expect(transport.violations).toHaveLength(3);
    });

    it('refuses an operation out of the order the run states, as it is sent', async () => {
      const transport = new AdversarialTransport(new Set([EXISTING_WORK]), {}, ['CreateWork']);

      await expect(
        transport.mutation(CREATE_PUBLICATION, { data: { workId: EXISTING_WORK, publicationType: 'PDF' } }),
      ).rejects.toThrow('where the run sends CreateWork');
      expect(transport.violations).toHaveLength(1);
    });
  });

  /* ---------------------------------------------------------------------------------------------- */

  describe('aggregate preflight before any write (#186)', () => {
    it('states one complete, deterministic finding and input set before anything can execute', async () => {
      const first = (await planningOf(existingEnrichment, 0)).resolution;
      const again = (await planningOf(existingEnrichment, 0)).resolution;
      const answered = (await planningOf(existingEnrichment, 1)).resolution;

      // Unanswered, nothing of the file is offered - not even the existing Work's ready attachment.
      expect(first?.plan).toBeNull();
      expect(first?.sidecar.blockers.map(({ code, classification }) => [code, classification])).toStrictEqual([
        ['WORK_TYPE_INPUT_REQUIRED', 'TARGET_INPUT_REQUIRED'],
      ]);
      // The same file plans the same findings, blockers and issues, in the same order.
      expect(again?.sidecar.findings).toStrictEqual(first?.sidecar.findings);
      expect(again?.sidecar.blockers).toStrictEqual(first?.sidecar.blockers);
      expect(again?.sidecar.issues).toStrictEqual(first?.sidecar.issues);
      // Complete: answering exactly the inputs it asked for raises no further question, and makes it executable.
      expect(answered?.sidecar.blockers).toStrictEqual([]);
      expect(answered?.sidecar.findings).toStrictEqual(first?.sidecar.findings);
      expect(answered?.plan).not.toBeNull();
    });

    it('offers no plan to execute while a contradiction or an unanswered input stands', async () => {
      for (const scenario of existingConflict.scenarios.keys()) {
        const resolution = (await planningOf(existingConflict, scenario)).resolution;

        expect(resolution?.plan).toBeNull();
        expect(resolution?.sidecar.executable).toBe(false);
      }
    });

    it('is ready only for the exact executable plan, whose bound sidecar it reports', () => {
      const report = buildImportPreflightReport(enrichment, new Map());

      expect(report.ready).toBe(true);
      expect(report.onix).toBe(enrichment.onix);
      // The same plan with a blocker bound into its sidecar is never ready, whatever else it holds.
      const blocked: ImportPlan = {
        ...enrichment,
        onix: { ...(enrichment.onix as NonNullable<ImportPlan['onix']>), blockers: [{ ...BLOCKER }] },
      };
      expect(buildImportPreflightReport(blocked, new Map()).ready).toBe(false);
    });

    it('binds the publisher’s confirmed answers into the immutable plan, and executes exactly them', async () => {
      const { inputs } = supply.scenarios[1];
      const { transport, error } = await execute(supplyPlan, heldBy(supply, 1));

      expect(error).toBeNull();
      expect(transport.violations).toStrictEqual([]);
      // The answers the publisher gave are the plan's own inputs, whole.
      expect(supplyPlan.onix?.inputs).toMatchObject(inputs ?? {});
      expect(enrichment.onix?.inputs.fileWorkType).toBe('MONOGRAPH');
      // Every Price sent is a Price the confirmed plan holds, in its order, and no other.
      expect(transport.sent('CreatePrice').map(({ data }) => data)).toStrictEqual(
        supplyPlan.works.flatMap((work, workIndex) =>
          work.publications.flatMap((publication, index) =>
            publication.prices.map(({ currencyCode, unitPrice }) => ({
              currencyCode,
              unitPrice,
              publicationId: publicationIdOf(transport, workIndex, index),
            })),
          ),
        ),
      );
    });

    it('never rederives a confirmed value: execution sends what the plan holds, even a value the source never stated', async () => {
      const altered = structuredClone(enrichment);
      const attach = altered.execution?.units[0].actions[0];
      if (attach?.kind !== 'CREATE_PUBLICATION' || attach.publication.source !== 'ATTACHMENT') {
        throw new Error('the enrichment plan no longer attaches its EPUB first');
      }
      (attach.publication.publication.prices[0] as { unitPrice: number }).unitPrice = 99;
      (altered.works[0] as { doi: string }).doi = 'https://doi.org/10.5555/confirmed.elsewhere';

      const { transport } = await execute(altered, heldBy(existingEnrichment, 1));

      expect(transport.violations).toStrictEqual([]);
      expect(transport.sent('CreatePrice')[0]).toMatchObject({ data: { currencyCode: 'EUR', unitPrice: 99 } });
      expect(transport.sent('CreateWork')[0]).toMatchObject({
        data: { doi: 'https://doi.org/10.5555/confirmed.elsewhere' },
      });
    });

    it('turns no warning and no unrepresentable fact into a write', async () => {
      const { transport } = await execute(enrichment, heldBy(existingEnrichment, 1));
      const sent = stringsOf(transport.calls.map(({ variables }) => variables));
      const issues = enrichment.onix?.issues ?? [];

      expect(transport.violations).toStrictEqual([]);
      expect(issues.map(({ code }) => code)).toContain('onix.target.already_present');
      // The PDF already in Thoth: disclosed, priced in the source, and never created or priced.
      expect(transport.sent('CreatePublication').map(({ data }) => (data as { isbn: string }).isbn)).toStrictEqual([
        '9781800060036',
        '9781800060043',
      ]);
      expect(transport.sent('CreatePrice').map(({ data }) => (data as { unitPrice: number }).unitPrice)).toStrictEqual([
        12,
      ]);
      // No message of any planning disclosure or finding reaches the API.
      [...issues.map(({ message }) => message), ...(enrichment.onix?.findings ?? []).map(({ message }) => message)]
        .filter((message) => message.length > 0)
        .forEach((message) => expect(sent).not.toContain(message));
      // A Location the plan does not create is never sent: the mirror's NOT_CREATED Location of the supply fixture.
      const supplied = await execute(supplyPlan, heldBy(supply, 1));
      expect(stringsOf(supplied.transport.sent('CreateLocation'))).not.toContain(
        'https://mirror-books.example/regression/supply',
      );
    });
  });

  /* ---------------------------------------------------------------------------------------------- */

  describe('stale or different plans fail closed', () => {
    it('blocks answers confirmed for another file: they are stale, never applied', async () => {
      const foreign = supply.scenarios[1].inputs ?? {};
      const resolution = (
        await planningOf(existingEnrichment, 1, { ...existingEnrichment.scenarios[1].inputs, ...foreign })
      ).resolution;

      expect(resolution?.plan).toBeNull();
      expect(resolution?.sidecar.blockers.map(({ code }) => code)).toContain('COMMERCIAL_CHOICE_STALE');
    });

    it('refuses before any mutation a confirmed execution layer run against another parse’s plan', async () => {
      const other = await confirmedPlanOf(existingEnrichment, 1);
      // The same file, confirmed twice: every planned Work has a plan-local id of its own parse.
      expect(other.works[0].id).not.toBe(enrichment.works[0].id);

      const mixed: ImportPlan = { ...other, execution: enrichment.execution };
      const { transport, error } = await execute(mixed, heldBy(existingEnrichment, 1));

      expect(transport.calls).toStrictEqual([]);
      expect(error?.context.cleanup).toStrictEqual({
        status: 'NOT_REQUIRED',
        retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT',
      });
      expect(error?.context.completed).toBe(0);
    });

    it('refuses before any mutation a plan whose units name a Publication with two canonical Locations', async () => {
      const malformed = structuredClone(enrichment);
      const attach = malformed.execution?.units[0].actions[0];
      if (attach?.kind !== 'CREATE_PUBLICATION' || attach.publication.source !== 'ATTACHMENT') {
        throw new Error('the enrichment plan no longer attaches its EPUB first');
      }
      attach.publication.publication.locations.forEach((location) => Object.assign(location, { canonical: true }));

      const { transport, error } = await execute(malformed, heldBy(existingEnrichment, 1));

      expect(transport.calls).toStrictEqual([]);
      expect(error?.context.cleanup?.status).toBe('NOT_REQUIRED');
    });
  });

  /* ---------------------------------------------------------------------------------------------- */

  describe('execution units and stage order (#187)', () => {
    it('runs a NOOP unit as a unit: it sends nothing, and completes', async () => {
      const { transport, progress, error } = await execute(noop, heldBy(existingNoop), {}, []);

      expect(error).toBeNull();
      expect(transport.calls).toStrictEqual([]);
      expect(transport.violations).toStrictEqual([]);
      expect(
        progress.map(({ current, stage, completed }) => [current.position, current.unit, stage, completed]),
      ).toStrictEqual([[1, 'NOOP', 'noop', 0]]);
      expect(noop.execution?.units[0].target).toStrictEqual({ kind: 'EXISTING_WORK', workId: NOOP_WORK });
    });

    it('attaches a Publication to the existing Work, then creates the new Work, each unit in its source order', async () => {
      const before = structuredClone(enrichment);
      const { transport, progress, error } = await execute(
        enrichment,
        heldBy(existingEnrichment, 1),
        {},
        ENRICHMENT_RUN,
      );

      expect(error).toBeNull();
      expect(transport.violations).toStrictEqual([]);
      expect(enrichment).toStrictEqual(before);
      expect(transport.operations()).toStrictEqual(ENRICHMENT_RUN);
      expect(transport.calls.map(({ unit }) => unit)).toStrictEqual([1, 1, 1, 1, 2, 2, 2, 2, 2, 2]);
      expect(
        progress.map(({ current, stage, completed }) => [current.position, current.unit, stage, completed]),
      ).toStrictEqual([
        [1, 'EXISTING_WORK', 'publication', 0],
        [2, 'NEW_WORK', 'work', 1],
        [2, 'NEW_WORK', 'publication', 1],
      ]);

      const [epub, paperback] = transport.sent('CreatePublication');
      const [created] = [...transport.minted].filter(([, { operation }]) => operation === 'CreateWork');

      // The attachment names the existing Work itself, which is otherwise never written.
      expect(epub).toMatchObject({ data: { workId: EXISTING_WORK, isbn: '9781800060036', publicationType: 'EPUB' } });
      expect(paperback).toMatchObject({
        data: { workId: created[0], isbn: '9781800060043', publicationType: 'PAPERBACK' },
      });
      expect(
        transport.calls
          .filter(({ variables }) => idsOf(variables).includes(EXISTING_WORK))
          .map(({ operation }) => operation),
      ).toStrictEqual(['CreatePublication']);
      expect(transport.sent('CreatePrice')).toStrictEqual([
        { data: { currencyCode: 'EUR', unitPrice: 12, publicationId: publicationIdOf(transport, -1, 0) } },
      ]);
      expect(transport.sent('CreateLocation').map(({ data }) => data)).toStrictEqual([
        {
          canonical: true,
          landingPage: 'https://regression-press.example/books/gains-a-format',
          fullTextUrl: 'https://regression-press.example/books/gains-a-format/full.epub',
          locationPlatform: 'PUBLISHER_WEBSITE',
          publicationId: publicationIdOf(transport, -1, 0),
        },
        {
          canonical: false,
          landingPage: 'https://open-shelf.example/titles/9781800060036',
          fullTextUrl: null,
          locationPlatform: 'OTHER',
          publicationId: publicationIdOf(transport, -1, 0),
        },
      ]);
      // The new Work names the existing contributor and institution the exact lookups returned: none is created.
      expect(transport.operations()).not.toContain('CreateContributor');
      expect(transport.sent('CreateContribution')[0]).toMatchObject({
        data: { contributorId: '00000000-0000-4000-8000-000000250301', workId: created[0], contributionOrdinal: 1 },
      });
      expect(transport.sent('CreateAffiliation')[0]).toMatchObject({
        data: { institutionId: '00000000-0000-4000-8000-000000250401', affiliationOrdinal: 1 },
      });
      expect(transport.sent('CreateWork')[0]).toMatchObject({
        data: {
          workType: 'MONOGRAPH',
          doi: 'https://doi.org/10.5555/regression.e03',
          imprintId: '11111111-1111-4111-8111-111111111111',
          edition: 1,
        },
      });
    });

    it('creates every Publication’s canonical Location before any other, one write at a time', async () => {
      const { transport, error } = await execute(supplyPlan, heldBy(supply, 1));

      expect(error).toBeNull();
      expect(transport.violations).toStrictEqual([]);

      const expected = supplyPlan.works.flatMap((work, workIndex) =>
        work.publications.flatMap((publication, index) =>
          [...publication.locations]
            .sort((a, b) => Number(b.canonical) - Number(a.canonical))
            .map(({ canonical, landingPage, locationPlatform }) => ({
              canonical,
              landingPage,
              locationPlatform,
              publicationId: publicationIdOf(transport, workIndex, index),
            })),
        ),
      );
      const sent = transport.sent('CreateLocation').map(({ data }) => {
        const { canonical, landingPage, locationPlatform, publicationId } = data as Record<string, unknown>;

        return { canonical, landingPage, locationPlatform, publicationId };
      });

      expect(sent).toStrictEqual(expected);
      // The supply fixture's first Publication holds a canonical and a non-canonical Location, in that order.
      expect(sent.slice(0, 2).map(({ canonical }) => canonical)).toStrictEqual([true, false]);
    });

    it('creates each chapter and contained Work after its parent, with its exact relation type and ordinal', async () => {
      const { transport, progress, error } = await execute(componentsPlan, heldBy(components, 3));

      expect(error).toBeNull();
      expect(transport.violations).toStrictEqual([]);

      const children = (componentsPlan.execution?.units[0].actions ?? []).flatMap((action) =>
        action.kind === 'CREATE_CHAPTER' || action.kind === 'CREATE_CONTAINED_WORK'
          ? [[action.kind === 'CREATE_CHAPTER' ? 'IS_CHILD_OF' : 'IS_PART_OF', action.ordinal]]
          : [],
      );
      const parent = [...transport.minted].find(([, { operation }]) => operation === 'CreateWork')?.[0];

      expect(children.length).toBeGreaterThan(1);
      expect(children.map(([type]) => type)).toContain('IS_PART_OF');
      expect(
        transport
          .sent('CreateWorkRelation')
          .map(({ data }) => [
            (data as Variables).relationType,
            (data as Variables).relationOrdinal,
            (data as Variables).relatedWorkId,
          ]),
      ).toStrictEqual(children.map(([type, ordinal]) => [type, ordinal, parent]));
      expect([...new Set(progress.map(({ stage }) => stage))]).toStrictEqual([
        'work',
        'publication',
        'chapter',
        'containedWork',
      ]);
    });

    it('creates a cross-Work relation once, in the unit the plan owns it, between the ids both Works were created with', async () => {
      const { transport, error } = await execute(licencePlan, heldBy(licence, 1));
      const edge = (licencePlan.relations ?? []).find(({ status }) => status === 'PLANNED');
      const works = [...transport.minted].filter(([, { operation }]) => operation === 'CreateWork');

      expect(error).toBeNull();
      expect(transport.violations).toStrictEqual([]);
      expect(edge).toBeDefined();
      expect(transport.sent('CreateWorkRelation')).toHaveLength(1);
      expect(transport.calls.at(-1)).toMatchObject({ operation: 'CreateWorkRelation', unit: 2 });
      expect(transport.sent('CreateWorkRelation')[0]).toMatchObject({
        data: {
          relationOrdinal: edge?.relationOrdinal,
          relationType: edge?.relationType,
          relatorWorkId: works[1][0],
          relatedWorkId: works[0][0],
        },
      });
      expect(transport.sent('CreateReference')).toHaveLength(1);
    });

    it('creates BookReviews, Endorsements and Awards under their Work, in stage order, with their exact ordinals and markup', async () => {
      const { transport, progress, error } = await execute(reviewsPlan, heldBy(reviews, 1));
      const actions = reviewsPlan.execution?.units[0].actions ?? [];
      const work = [...transport.minted].find(([, { operation }]) => operation === 'CreateWork')?.[0];

      expect(error).toBeNull();
      expect(transport.violations).toStrictEqual([]);
      expect(transport.operations().slice(-4)).toStrictEqual([
        'CreateBookReview',
        'CreateBookReview',
        'CreateEndorsement',
        'CreateAward',
      ]);
      expect(
        transport.calls.slice(-4).map(({ variables }) => {
          const data = variables.data as Variables;

          return [
            data.workId,
            data.reviewOrdinal ?? data.endorsementOrdinal ?? data.awardOrdinal,
            variables.markupFormat,
          ];
        }),
      ).toStrictEqual(
        actions.flatMap((action) => {
          if (action.kind === 'CREATE_BOOK_REVIEW') return [[work, action.review.orderNumber, action.markupFormat]];
          if (action.kind === 'CREATE_ENDORSEMENT')
            return [[work, action.endorsement.orderNumber, action.markupFormat]];
          if (action.kind === 'CREATE_AWARD') return [[work, action.award.orderNumber, action.markupFormat]];

          return [];
        }),
      );
      expect([...new Set(progress.map(({ stage }) => stage))].slice(-3)).toStrictEqual([
        'bookReview',
        'endorsement',
        'award',
      ]);
    });

    it('creates a proposed Series the first time a unit needs it, then the issue, at the plan’s ordinal', async () => {
      const { transport, error } = await execute(subjectsPlan, heldBy(subjects, 1));
      const [membership] = subjectsPlan.series[0].members;

      expect(error).toBeNull();
      expect(transport.violations).toStrictEqual([]);
      expect(transport.operations().slice(-2)).toStrictEqual(['CreateSeries', 'CreateIssue']);
      expect(transport.sent('CreateIssue')[0]).toMatchObject({
        data: { issueOrdinal: membership.orderNumber, issueNumber: membership.issueNumber },
      });
    });

    it('creates each AdditionalResource under its Work at its planned ordinal', async () => {
      const { transport, error } = await execute(collateralPlan, heldBy(collateral, 1));
      const ordinals = (collateralPlan.execution?.units[0].actions ?? []).flatMap((action) =>
        action.kind === 'CREATE_ADDITIONAL_RESOURCE' ? [action.resource.orderNumber] : [],
      );

      expect(error).toBeNull();
      expect(transport.violations).toStrictEqual([]);
      expect(
        transport.sent('CreateAdditionalResource').map(({ data }) => (data as Variables).resourceOrdinal),
      ).toStrictEqual(ordinals);
    });
  });

  /* ---------------------------------------------------------------------------------------------- */

  describe('failure context, compensation and retry truthfulness (#187)', () => {
    type Case = {
      readonly name: string;
      readonly plan: () => ImportPlan;
      readonly fixture: OnixRegressionFixture;
      readonly scenario: number;
      readonly faults: Faults;
      readonly position: number;
      readonly completed: number;
      readonly stage: string;
      readonly unit: 'NEW_WORK' | 'EXISTING_WORK';
    };

    const CASES: readonly Case[] = [
      {
        name: 'the attached Publication’s non-canonical Location',
        plan: () => enrichment,
        fixture: existingEnrichment,
        scenario: 1,
        faults: { CreateLocation: { 2: 'THROW' } },
        position: 1,
        completed: 0,
        stage: 'publication',
        unit: 'EXISTING_WORK',
      },
      {
        name: 'the new Work’s affiliation',
        plan: () => enrichment,
        fixture: existingEnrichment,
        scenario: 1,
        faults: { CreateAffiliation: { 1: 'THROW' } },
        position: 2,
        completed: 1,
        stage: 'work',
        unit: 'NEW_WORK',
      },
      {
        name: 'the new Work’s Publication, after the existing Work’s unit completed',
        plan: () => enrichment,
        fixture: existingEnrichment,
        scenario: 1,
        faults: { CreatePublication: { 2: 'THROW' } },
        position: 2,
        completed: 1,
        stage: 'publication',
        unit: 'NEW_WORK',
      },
      {
        name: 'the contained Work’s IS_PART_OF relation',
        plan: () => componentsPlan,
        fixture: components,
        scenario: 3,
        faults: { CreateWorkRelation: { 4: 'THROW' } },
        position: 1,
        completed: 0,
        stage: 'containedWork',
        unit: 'NEW_WORK',
      },
      {
        name: 'a chapter’s IS_CHILD_OF relation',
        plan: () => componentsPlan,
        fixture: components,
        scenario: 3,
        faults: { CreateWorkRelation: { 2: 'THROW' } },
        position: 1,
        completed: 0,
        stage: 'chapter',
        unit: 'NEW_WORK',
      },
      {
        name: 'the cross-Work relation of the second unit',
        plan: () => licencePlan,
        fixture: licence,
        scenario: 1,
        faults: { CreateWorkRelation: { 1: 'THROW' } },
        position: 2,
        completed: 1,
        stage: 'relation',
        unit: 'NEW_WORK',
      },
      {
        name: 'the second BookReview',
        plan: () => reviewsPlan,
        fixture: reviews,
        scenario: 1,
        faults: { CreateBookReview: { 2: 'THROW' } },
        position: 1,
        completed: 0,
        stage: 'bookReview',
        unit: 'NEW_WORK',
      },
      {
        name: 'the Endorsement',
        plan: () => reviewsPlan,
        fixture: reviews,
        scenario: 1,
        faults: { CreateEndorsement: { 1: 'THROW' } },
        position: 1,
        completed: 0,
        stage: 'endorsement',
        unit: 'NEW_WORK',
      },
      {
        name: 'the Award',
        plan: () => reviewsPlan,
        fixture: reviews,
        scenario: 1,
        faults: { CreateAward: { 1: 'THROW' } },
        position: 1,
        completed: 0,
        stage: 'award',
        unit: 'NEW_WORK',
      },
      {
        name: 'the Series issue',
        plan: () => subjectsPlan,
        fixture: subjects,
        scenario: 1,
        faults: { CreateIssue: { 1: 'THROW' } },
        position: 1,
        completed: 0,
        stage: 'series',
        unit: 'NEW_WORK',
      },
      {
        name: 'the second AdditionalResource',
        plan: () => collateralPlan,
        fixture: collateral,
        scenario: 1,
        faults: { CreateAdditionalResource: { 2: 'THROW' } },
        position: 1,
        completed: 0,
        stage: 'additionalResource',
        unit: 'NEW_WORK',
      },
    ];

    it.each(CASES.map((testCase) => [testCase.name, testCase] as const))(
      'names the exact stage and unit of a failed write, and removes only what that attempt created: %s',
      async (_name, testCase) => {
        const plan = testCase.plan();
        const { transport, error } = await execute(plan, heldBy(testCase.fixture, testCase.scenario), testCase.faults);
        const failedAt = transport.calls.findIndex(({ operation }, index) => {
          const occurrence = transport.calls.slice(0, index + 1).filter((call) => call.operation === operation).length;

          return testCase.faults[operation]?.[occurrence] === 'THROW';
        });

        expect(transport.violations).toStrictEqual([]);
        expect(error).toBeInstanceOf(ImportExecutionError);
        // The original API message, and exactly where the run stopped.
        expect(error?.message).toBe(`${transport.calls[failedAt].operation} failed at the API`);
        expect(error?.context).toMatchObject({
          total: plan.execution?.units.length,
          completed: testCase.completed,
          current: { position: testCase.position, unit: testCase.unit },
          stage: testCase.stage,
        });
        // Nothing after the failed write was sent but the failed unit's own compensation.
        const after = transport.calls.slice(failedAt + 1);
        after.forEach(({ operation }) => expect(DELETES[operation]).toBeDefined());

        const cleanup = error?.context.cleanup as Extract<ImportCleanupDisposition, { status: 'VERIFIED' }>;
        // Every journaled write of the attempt was removed, newest first, each proven by the exact id returned.
        expect(cleanup.status).toBe('VERIFIED');
        expect(cleanup.retry).toBe('COMPLETE_FILE_AFTER_FRESH_PREFLIGHT');
        expect(after.map(({ variables }) => idsOf(variables)[0])).toStrictEqual(
          cleanup.compensated.map(({ entityId }) => entityId),
        );
        // Attempt-local: only what the failed unit itself created, never an earlier unit's write or a held entity.
        cleanup.compensated.forEach(({ entityId }) => {
          expect(transport.minted.get(entityId)?.unit).toBe(testCase.position);
          expect(heldBy(testCase.fixture, testCase.scenario).has(entityId)).toBe(false);
        });
        const createdInOrder = [...transport.minted.keys()];
        expect(cleanup.compensated.map(({ entityId }) => createdInOrder.indexOf(entityId))).toStrictEqual(
          cleanup.compensated.map(({ entityId }) => createdInOrder.indexOf(entityId)).sort((a, b) => b - a),
        );
        // A NEW_WORK unit's top-level Work is the last thing removed; an EXISTING_WORK unit's Work is never removed.
        const top = cleanup.compensated.at(-1);
        if (testCase.unit === 'NEW_WORK') {
          expect(top?.operation).toBe('DELETE_WORK');
          expect(transport.minted.get(top?.entityId ?? '')?.operation).toBe('CreateWork');
        } else {
          expect(cleanup.compensated.map(({ operation }) => operation)).not.toContain('DELETE_WORK');
        }

        // The ledger and the report say exactly this, and never claim atomicity or a rollback of the file.
        const { ledger, report } = accountOf(plan, error as ImportExecutionError);
        expect(ledger.map(({ status }) => status)).toStrictEqual(
          (plan.execution?.units ?? []).map(({ sourceOrder }) =>
            sourceOrder < testCase.position
              ? 'completed'
              : sourceOrder === testCase.position
                ? 'failed'
                : 'notAttempted',
          ),
        );
        expect(ledger[testCase.position - 1].stage).toBe(testCase.stage);
        expect(report).toContain('Cleanup: verified.');
        expect(report).toContain('Upload the complete file again');
        expect(report).not.toContain('Manual reconciliation required');
        cleanup.compensated.forEach(({ entityId }) => expect(report).toContain(entityId));
        expectNoAtomicityClaim(report);
      },
    );

    it('never deletes the pre-existing Work: an attachment that fails removes only the Publication it created', async () => {
      const { transport, error } = await execute(
        enrichment,
        heldBy(existingEnrichment, 1),
        { CreateLocation: { 2: 'THROW' } },
        [...ENRICHMENT_RUN.slice(0, 4), 'DeletePublication'],
      );
      const cleanup = error?.context.cleanup;
      const publication = publicationIdOf(transport, -1, 0);

      expect(transport.violations).toStrictEqual([]);
      expect(cleanup).toStrictEqual({
        status: 'VERIFIED',
        retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT',
        compensated: [
          { operation: 'DELETE_PUBLICATION', entityId: publication, actionKey: ATTACH_KEY, stage: 'publication' },
        ],
      });
      expect(transport.operations().slice(-1)).toStrictEqual(['DeletePublication']);
      expect(transport.operations()).not.toContain('DeleteWork');
      // The later unit, which would create a new Work, never started.
      expect(transport.operations()).not.toContain('CreateWork');
    });

    it('keeps an earlier unit committed, and removes the failed unit’s Work - and everything under it - by its id', async () => {
      const { transport, error } = await execute(
        enrichment,
        heldBy(existingEnrichment, 1),
        { CreatePublication: { 2: 'THROW' } },
        [...ENRICHMENT_RUN, 'DeleteWork'],
      );
      const [work] = [...transport.minted].find(([, { operation }]) => operation === 'CreateWork') ?? [];

      expect(transport.violations).toStrictEqual([]);
      expect(error?.context.cleanup).toStrictEqual({
        status: 'VERIFIED',
        retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT',
        compensated: [{ operation: 'DELETE_WORK', entityId: work, actionKey: NEW_WORK_KEY, stage: 'work' }],
      });
      // The attached EPUB of the completed first unit stays: it is never deleted.
      expect(transport.operations().filter((operation) => operation.startsWith('Delete'))).toStrictEqual([
        'DeleteWork',
      ]);
      expect(transport.sent('DeleteWork')).toStrictEqual([{ workId: work }]);
      const { report } = accountOf(enrichment, error as ImportExecutionError);
      expect(report).toContain('Earlier units stay imported');
    });

    it('accepts a Contributor the failed unit created as residue: it is never deleted, and the report says so', async () => {
      const { transport, error } = await execute(reviewsPlan, heldBy(reviews, 1), { CreateAward: { 1: 'THROW' } });
      const [contributor] = [...transport.minted].find(([, { operation }]) => operation === 'CreateContributor') ?? [];
      const cleanup = error?.context.cleanup;

      expect(transport.violations).toStrictEqual([]);
      expect(contributor).toBeDefined();
      expect(cleanup?.status).toBe('VERIFIED');
      expect(stringsOf(cleanup)).not.toContain(contributor);
      expect(stringsOf(transport.calls.filter(({ operation }) => operation.startsWith('Delete')))).not.toContain(
        contributor,
      );
      expect(accountOf(reviewsPlan, error as ImportExecutionError).report).toContain(
        'A contributor created for the stopped unit may remain as an unused record',
      );
    });

    it('keeps a Series the failed unit created as the approved residue a fresh preflight finds again', async () => {
      const { transport, error } = await execute(subjectsPlan, heldBy(subjects, 1), { CreateIssue: { 1: 'THROW' } });
      const [series] = [...transport.minted].find(([, { operation }]) => operation === 'CreateSeries') ?? [];
      const cleanup = error?.context.cleanup;

      expect(transport.violations).toStrictEqual([]);
      expect(series).toBeDefined();
      // Only the Work - and the issue with it - is removed; the Series is never journaled, so never deleted.
      expect(cleanup?.status).toBe('VERIFIED');
      expect(cleanup?.status === 'VERIFIED' && cleanup.compensated.map(({ operation }) => operation)).toStrictEqual([
        'DELETE_WORK',
      ]);
      expect(stringsOf(cleanup)).not.toContain(series);
      expect(cleanup?.retry).toBe('COMPLETE_FILE_AFTER_FRESH_PREFLIGHT');
    });

    it.each([
      ['fails without an answer', 'THROW'],
      ['returns no Publication id', 'NO_ID'],
    ] as const)(
      'never describes an attachment whose create %s as removed: its outcome is unknown, and needs reconciling by hand',
      async (_name, fault) => {
        const { transport, error } = await execute(enrichment, heldBy(existingEnrichment, 1), {
          CreatePublication: { 1: fault },
        });
        const cleanup = error?.context.cleanup;

        expect(transport.violations).toStrictEqual([]);
        expect(transport.operations()).toStrictEqual(['CreatePublication']);
        expect(cleanup).toMatchObject({
          status: 'FAILED_OR_UNKNOWN',
          retry: 'MANUAL_RECONCILIATION_REQUIRED',
          compensated: [],
          failures: [
            { operation: 'CREATE_OUTCOME_UNKNOWN', entityId: null, actionKey: ATTACH_KEY, stage: 'publication' },
          ],
        });

        const { report } = accountOf(enrichment, error as ImportExecutionError);
        expect(report).toContain('Cleanup: failed or unknown.');
        expect(report).toContain('Manual reconciliation required');
        expect(report).not.toContain('Cleanup: verified');
        expect(report).not.toContain('Upload the complete file again');
        expectNoAtomicityClaim(report);
      },
    );

    it.each([
      ['answers with another id', 'WRONG_ID'],
      ['answers with no id', 'NO_ID'],
      ['fails', 'THROW'],
    ] as const)('never counts a compensating delete that %s as proof of removal', async (_name, fault) => {
      const { transport, error } = await execute(enrichment, heldBy(existingEnrichment, 1), {
        CreateLocation: { 2: 'THROW' },
        DeletePublication: { 1: fault },
      });
      const cleanup = error?.context.cleanup;
      const publication = publicationIdOf(transport, -1, 0);

      expect(transport.violations).toStrictEqual([]);
      expect(cleanup).toMatchObject({
        status: 'FAILED_OR_UNKNOWN',
        retry: 'MANUAL_RECONCILIATION_REQUIRED',
        compensated: [],
        failures: [
          { operation: 'DELETE_PUBLICATION', entityId: publication, actionKey: ATTACH_KEY, stage: 'publication' },
        ],
      });
      // The run's own error stays the failure; the cleanup is reported beside it.
      expect(error?.message).toBe('CreateLocation failed at the API');

      const { report } = accountOf(enrichment, error as ImportExecutionError);
      expect(report).toContain(`- Publication ${publication}`);
      expect(report).toContain('Manual reconciliation required');
      expectNoAtomicityClaim(report);
    });
  });
});

/**
 * The id the transport minted for the `index`-th Publication created under the `workIndex`-th Work this run created, or,
 * for `-1`, under a Work it did not create - the existing Work an attachment names.
 */
const publicationIdOf = (transport: AdversarialTransport, workIndex: number, index: number): string => {
  const works = transport.calls.filter(({ operation }) => operation === 'CreateWork').map(({ created }) => created);
  const publications = transport.calls.filter(
    ({ operation, created, variables }) =>
      operation === 'CreatePublication' &&
      created !== undefined &&
      works.indexOf((variables.data as Variables).workId as string) === workIndex,
  );

  return publications[index]?.created ?? '';
};

/** A blocker bound into a sidecar, for the readiness check. */
const BLOCKER = {
  code: 'WORK_TYPE_INPUT_REQUIRED',
  classification: 'TARGET_INPUT_REQUIRED',
  recordKey: null,
  productKey: null,
  groupKey: 'work:x',
  paths: [],
  detail: {},
} as const;
