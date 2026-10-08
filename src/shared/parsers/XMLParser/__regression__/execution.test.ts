// @vitest-environment node
import { isDeepStrictEqual } from 'node:util';

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
  ImportExecutionAction,
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
 * The transport stands in for the Thoth API and nothing else. Every run is given the exact transcript of the calls the
 * confirmed plan makes, and the transport checks each request against it as the request is sent: the operation, its
 * order, the execution unit that sends it and its complete variables as they go on the wire. A created id a later call
 * names is bound by label to the id the transport minted for the earlier call. It also refuses any query (a confirmed
 * plan is executed without reading Thoth), any operation the import does not send, any id it did not mint and the
 * scenario does not hold, any placeholder id, and any delete of something this run did not create; answers each create
 * with a deterministic id and the shape the generated document selects; and fails a chosen write the way the API would.
 * A refusal fails the test even when the production code caught the throw, and so does an expected call never sent.
 * Nothing here decides an outcome: every expected call is one the confirmed plan and its fixture's contract state.
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

/**
 * A value an expected call binds that only the fake API knows: the id it minted for the earlier expected call labelled
 * `label`. The transport resolves it when it compares a request, and decides nothing by it - which Work, Publication or
 * child exists is the transcript's, and so the confirmed plan's.
 */
class Minted {
  constructor(readonly label: string) {}
}

const minted = (label: string): Minted => new Minted(label);

/**
 * One call a run must make, exactly: its operation, its complete variables, the execution unit that sends it, and - for
 * a create whose id a later call names - the label that id is bound to.
 */
type ExpectedCall = {
  readonly operation: string;
  readonly variables: unknown;
  readonly unit: number;
  readonly mints?: string;
};

const call = (
  operation: string,
  variables: unknown,
  { unit, mints }: { readonly unit: number; readonly mints?: string },
): ExpectedCall => ({ operation, variables, unit, ...(mints === undefined ? {} : { mints }) });

/** Variables as the API receives them: serialised, so a key whose value is `undefined` is not sent at all. */
const onTheWire = (value: unknown): unknown => JSON.parse(JSON.stringify(value)) as unknown;

/** An expectation with every label replaced by the id minted for it; a label nothing minted yet stays visible as such. */
const resolveMinted = (value: unknown, labels: ReadonlyMap<string, string>): unknown => {
  if (value instanceof Minted) return labels.get(value.label) ?? `<${value.label}: not minted>`;
  if (Array.isArray(value)) return value.map((item) => resolveMinted(item, labels));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, resolveMinted(child, labels)]));
  }

  return value;
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

  /** The id minted for each labelled expected call. */
  private readonly labels = new Map<string, string>();

  /**
   * `holds`: the ids the scenario's Thoth already holds. `transcript`: every call the run must make, in order - each
   * request is checked against it as it is sent (only the transport's own self-tests omit it). `faults`: the writes the
   * API fails.
   */
  constructor(
    private readonly holds: ReadonlySet<string>,
    private readonly transcript?: readonly ExpectedCall[],
    private readonly faults: Faults = {},
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

    const expected = this.expectedFor(call);

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
    let id: string | null = null;

    // A create the API answers without naming what it created mints nothing, and binds no label.
    if (fault !== 'NO_ID') {
      this.sequence += 1;
      id = `${field.slice('create'.length).toLowerCase()}-${this.sequence}`;
      this.minted.set(id, { operation, unit: this.unit });
      call.created = id;
      if (expected?.mints !== undefined) this.labels.set(expected.mints, id);
    }

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

  /** Records every expected call the run never sent; `execute` calls it once the run has returned or thrown. */
  settle(): void {
    (this.transcript ?? [])
      .slice(this.calls.length)
      .forEach(({ operation }, index) =>
        this.violations.push(
          `call ${this.calls.length + index + 1} (${operation}) of the confirmed run was never sent`,
        ),
      );
  }

  /** The operations sent, in order. */
  operations(): string[] {
    return this.calls.map(({ operation }) => operation);
  }

  /** The variables of every call of one operation, in order. */
  sent(operation: string): Variables[] {
    return this.calls.filter((call) => call.operation === operation).map(({ variables }) => variables);
  }

  /**
   * The expected call a request must be, checked as the request is sent: the operation at its position, the unit that
   * sends it, and its complete variables on the wire, with every label resolved to the id minted for it. Any difference,
   * or a request beyond the transcript, is refused there and then.
   */
  private expectedFor(sent: TransportCall): ExpectedCall | undefined {
    if (this.transcript === undefined) return undefined;

    const position = this.calls.length;
    const expected = this.transcript[position - 1];

    if (expected === undefined) {
      throw this.violate(
        `call ${position} (${sent.operation}) is beyond the ${this.transcript.length} calls of the confirmed run`,
      );
    }
    if (expected.operation !== sent.operation) {
      throw this.violate(
        `call ${position}: ${sent.operation} sent where the confirmed run sends ${expected.operation}`,
      );
    }
    if (expected.unit !== sent.unit) {
      throw this.violate(
        `call ${position} (${sent.operation}): sent by unit ${sent.unit}, where the confirmed run sends it from unit ${expected.unit}`,
      );
    }

    const want = onTheWire(resolveMinted(expected.variables, this.labels));
    const got = onTheWire(sent.variables);

    if (!isDeepStrictEqual(got, want)) {
      throw this.violate(
        `call ${position} (${sent.operation}): variables differ from the confirmed run: expected ${JSON.stringify(want)}, sent ${JSON.stringify(got)}`,
      );
    }

    return expected;
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

/**
 * Runs a confirmed plan through `WorkService.bulkCreateWorks`, as the preview's Create does, over a fresh transport that
 * holds the run to `transcript`: every call, in order, with its unit and complete variables, and no other.
 */
const execute = async (
  plan: ImportPlan,
  holds: ReadonlySet<string>,
  transcript: readonly ExpectedCall[],
  faults: Faults = {},
): Promise<Execution> => {
  const transport = new AdversarialTransport(holds, transcript, faults);
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

  transport.settle();

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

const NEW_WORK_KEY = existingEnrichment.scenarios[1].planning.execution?.units[1].actions[0].actionKey ?? '';

/* ------------------------------------------------------------------------------------------------ */
/* The confirmed runs, call by call                                                                  */
/* ------------------------------------------------------------------------------------------------ */

/*
 * Each transcript below is the exact run its fixture's confirmed plan makes: every call in order, with its unit and its
 * complete variables as they go on the wire. Every value is one the registered CONTRACT fixture's confirmed plan holds
 * (its planned Works, Publications, Prices, Locations, children and ordinals) or a held id its Thoth states; created ids
 * are bound by label. A value the plan leaves unset is sent as null by the entity mappers, and is stated so.
 */

/** The imprint every registered fixture plans under, and the contributor and institution the enrichment Thoth holds. */
const IMPRINT = '11111111-1111-4111-8111-111111111111';
const HELD_CONTRIBUTOR = '00000000-0000-4000-8000-000000250301';
const HELD_INSTITUTION = '00000000-0000-4000-8000-000000250401';

/**
 * A `CreateWork` request: every `NewWork` field of the confirmed Work row - those the row leaves unset sent as null - and
 * the markup format the Work-creation path sends. `pageBreakdown` is the shared Work mapper's encoding of the row's
 * front- and back-matter counts, which no ONIX reduction plans: the Work entity's default 0 is written as `nulla`, the
 * roman-numerals library's zero (`romans.test.ts`), around the row's own page count.
 */
const workRow = (stated: Readonly<Record<string, unknown>>) => ({
  data: {
    workStatus: null,
    imprintId: null,
    workType: null,
    edition: null,
    license: null,
    copyrightHolder: null,
    doi: null,
    lccn: null,
    oclc: null,
    bibliographyNote: null,
    generalNote: null,
    toc: null,
    landingPage: null,
    coverUrl: null,
    coverCaption: null,
    publicationDate: null,
    withdrawnDate: null,
    imageCount: null,
    tableCount: null,
    audioCount: null,
    videoCount: null,
    pageCount: null,
    firstPage: null,
    lastPage: null,
    pageBreakdown: null,
    place: null,
    reference: null,
    ...stated,
  },
  markupFormat: 'JATS_XML',
});

/** A `CreatePublication` request: the confirmed Publication's Work, ISBN and type, its unset dimensions and accessibility null. */
const publicationRow = (workId: unknown, isbn: string, publicationType: string) => ({
  data: {
    workId,
    isbn,
    publicationType,
    widthMm: null,
    widthIn: null,
    heightMm: null,
    heightIn: null,
    depthMm: null,
    depthIn: null,
    weightG: null,
    weightOz: null,
    accessibilityStandard: null,
    accessibilityAdditionalStandard: null,
    accessibilityException: null,
    accessibilityReportUrl: null,
  },
});

/** The new Work the enrichment plan creates beside the existing one. */
const ENRICHMENT_NEW_WORK = {
  workStatus: 'ACTIVE',
  imprintId: IMPRINT,
  workType: 'MONOGRAPH',
  edition: 1,
  doi: 'https://doi.org/10.5555/regression.e03',
  publicationDate: '2026-03-01',
  pageBreakdown: 'nulla+0+nulla',
};

/**
 * `existing-target-enrichment`, answered: unit 1 attaches the EPUB to the existing Work - the Publication, its one EUR
 * Price, its canonical Location, then the other - naming the existing Work itself; unit 2 creates the new Work, its title,
 * a contribution naming the existing contributor with an affiliation naming the existing institution, its language and its
 * paperback. No other write: nothing of the existing Work is written, and no contributor or institution is created.
 */
const ENRICHMENT_TRANSCRIPT: readonly ExpectedCall[] = [
  call('CreatePublication', publicationRow(EXISTING_WORK, '9781800060036', 'EPUB'), { unit: 1, mints: 'publication1' }),
  call(
    'CreatePrice',
    { data: { currencyCode: 'EUR', unitPrice: 12, publicationId: minted('publication1') } },
    { unit: 1 },
  ),
  call(
    'CreateLocation',
    {
      data: {
        canonical: true,
        fullTextUrl: 'https://regression-press.example/books/gains-a-format/full.epub',
        landingPage: 'https://regression-press.example/books/gains-a-format',
        locationPlatform: 'PUBLISHER_WEBSITE',
        publicationId: minted('publication1'),
      },
    },
    { unit: 1 },
  ),
  call(
    'CreateLocation',
    {
      data: {
        canonical: false,
        fullTextUrl: null,
        landingPage: 'https://open-shelf.example/titles/9781800060036',
        locationPlatform: 'OTHER',
        publicationId: minted('publication1'),
      },
    },
    { unit: 1 },
  ),
  call('CreateWork', workRow(ENRICHMENT_NEW_WORK), { unit: 2, mints: 'work1' }),
  call(
    'CreateTitle',
    {
      data: {
        canonical: true,
        fullTitle: 'A New Work Beside It',
        localeCode: 'EN',
        subtitle: null,
        title: 'A New Work Beside It',
        workId: minted('work1'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 2 },
  ),
  call(
    'CreateContribution',
    {
      data: {
        workId: minted('work1'),
        contributorId: HELD_CONTRIBUTOR,
        contributionType: 'AUTHOR',
        mainContribution: true,
        firstName: 'Ada',
        lastName: 'Lovelace',
        fullName: 'Ada Lovelace',
        contributionOrdinal: 1,
      },
    },
    { unit: 2, mints: 'contribution1' },
  ),
  call(
    'CreateAffiliation',
    {
      data: {
        contributionId: minted('contribution1'),
        institutionId: HELD_INSTITUTION,
        affiliationOrdinal: 1,
        position: null,
      },
    },
    { unit: 2 },
  ),
  call(
    'CreateLanguage',
    { data: { languageCode: 'ENG', languageRelation: 'ORIGINAL', workId: minted('work1') } },
    { unit: 2 },
  ),
  call('CreatePublication', publicationRow(minted('work1'), '9781800060043', 'PAPERBACK'), {
    unit: 2,
    mints: 'publication2',
  }),
];

/**
 * `target-supply-prices-locations`, answered: the Work, then the PDF with every currency's one Price in plan order
 * (the publisher's USD answer among them) and its canonical then non-canonical Location, then the hardback. The mirror's
 * NOT_CREATED Location and every Price the plan does not take are not written.
 */
const SUPPLY_TRANSCRIPT: readonly ExpectedCall[] = [
  call(
    'CreateWork',
    workRow({
      workStatus: 'ACTIVE',
      imprintId: IMPRINT,
      workType: 'MONOGRAPH',
      edition: 1,
      doi: 'https://doi.org/10.5555/regression.d103',
      publicationDate: '2026-03-01',
      pageBreakdown: 'nulla+0+nulla',
    }),
    { unit: 1, mints: 'work1' },
  ),
  call(
    'CreateTitle',
    {
      data: {
        canonical: true,
        fullTitle: 'Supply in Several Markets',
        localeCode: 'EN',
        subtitle: null,
        title: 'Supply in Several Markets',
        workId: minted('work1'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateLanguage',
    { data: { languageCode: 'ENG', languageRelation: 'ORIGINAL', workId: minted('work1') } },
    { unit: 1 },
  ),
  call('CreatePublication', publicationRow(minted('work1'), '9781800003019', 'PDF'), {
    unit: 1,
    mints: 'publication1',
  }),
  call(
    'CreatePrice',
    { data: { currencyCode: 'CAD', unitPrice: 30, publicationId: minted('publication1') } },
    { unit: 1 },
  ),
  call(
    'CreatePrice',
    { data: { currencyCode: 'EUR', unitPrice: 22, publicationId: minted('publication1') } },
    { unit: 1 },
  ),
  call(
    'CreatePrice',
    { data: { currencyCode: 'GBP', unitPrice: 20, publicationId: minted('publication1') } },
    { unit: 1 },
  ),
  call(
    'CreatePrice',
    { data: { currencyCode: 'USD', unitPrice: 27.5, publicationId: minted('publication1') } },
    { unit: 1 },
  ),
  call(
    'CreateLocation',
    {
      data: {
        canonical: true,
        fullTextUrl: 'https://regression-press.example/books/supply/full.pdf',
        landingPage: 'https://regression-press.example/books/supply',
        locationPlatform: 'PUBLISHER_WEBSITE',
        publicationId: minted('publication1'),
      },
    },
    { unit: 1 },
  ),
  call(
    'CreateLocation',
    {
      data: {
        canonical: false,
        fullTextUrl: null,
        landingPage: 'https://open-shelf.example/titles/9781800003019',
        locationPlatform: 'OTHER',
        publicationId: minted('publication1'),
      },
    },
    { unit: 1 },
  ),
  call('CreatePublication', publicationRow(minted('work1'), '9781800003026', 'HARDBACK'), {
    unit: 1,
    mints: 'publication2',
  }),
  call(
    'CreatePrice',
    { data: { currencyCode: 'GBP', unitPrice: 35, publicationId: minted('publication2') } },
    { unit: 1 },
  ),
  call(
    'CreateLocation',
    {
      data: {
        canonical: true,
        fullTextUrl: null,
        landingPage: 'https://regression-press.example/books/supply',
        locationPlatform: 'PUBLISHER_WEBSITE',
        publicationId: minted('publication2'),
      },
    },
    { unit: 1 },
  ),
];

/**
 * `target-components-hierarchy`, every answer in its own map: the Work and its PDF, then in confirmed source order each
 * chapter (its pages, its IS_CHILD_OF ordinal) and the contained Work (MONOGRAPH, its two Thema subjects, IS_PART_OF 3).
 */
const COMPONENTS_TRANSCRIPT: readonly ExpectedCall[] = [
  call(
    'CreateWork',
    workRow({
      workStatus: 'ACTIVE',
      imprintId: IMPRINT,
      workType: 'MONOGRAPH',
      edition: 1,
      publicationDate: '2026-03-01',
      pageBreakdown: 'nulla+0+nulla',
    }),
    { unit: 1, mints: 'work1' },
  ),
  call(
    'CreateTitle',
    {
      data: {
        canonical: true,
        fullTitle: 'Components in Order',
        localeCode: 'EN',
        subtitle: null,
        title: 'Components in Order',
        workId: minted('work1'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateLanguage',
    { data: { languageCode: 'ENG', languageRelation: 'ORIGINAL', workId: minted('work1') } },
    { unit: 1 },
  ),
  call('CreatePublication', publicationRow(minted('work1'), '9781800006010', 'PDF'), {
    unit: 1,
    mints: 'publication1',
  }),
  call(
    'CreateWork',
    workRow({
      workStatus: 'ACTIVE',
      imprintId: IMPRINT,
      workType: 'BOOK_CHAPTER',
      publicationDate: '2026-03-01',
      firstPage: '1',
      lastPage: '8',
      pageBreakdown: 'nulla+0+nulla',
    }),
    { unit: 1, mints: 'work2' },
  ),
  call(
    'CreateTitle',
    {
      data: {
        canonical: true,
        fullTitle: 'Preface',
        localeCode: 'EN',
        subtitle: null,
        title: 'Preface',
        workId: minted('work2'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateWorkRelation',
    {
      data: {
        relatorWorkId: minted('work2'),
        relatedWorkId: minted('work1'),
        relationOrdinal: 1,
        relationType: 'IS_CHILD_OF',
      },
    },
    { unit: 1 },
  ),
  call(
    'CreateWork',
    workRow({
      workStatus: 'ACTIVE',
      imprintId: IMPRINT,
      workType: 'BOOK_CHAPTER',
      publicationDate: '2026-03-01',
      pageCount: 26,
      firstPage: '9',
      lastPage: '30',
      pageBreakdown: 'nulla+26+nulla',
    }),
    { unit: 1, mints: 'work3' },
  ),
  call(
    'CreateTitle',
    {
      data: {
        canonical: true,
        fullTitle: 'Two Runs of Pages',
        localeCode: 'EN',
        subtitle: null,
        title: 'Two Runs of Pages',
        workId: minted('work3'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateWorkRelation',
    {
      data: {
        relatorWorkId: minted('work3'),
        relatedWorkId: minted('work1'),
        relationOrdinal: 2,
        relationType: 'IS_CHILD_OF',
      },
    },
    { unit: 1 },
  ),
  call(
    'CreateWork',
    workRow({
      workStatus: 'ACTIVE',
      imprintId: IMPRINT,
      workType: 'BOOK_CHAPTER',
      publicationDate: '2026-03-01',
      firstPage: '31',
      lastPage: '40',
      pageBreakdown: 'nulla+0+nulla',
    }),
    { unit: 1, mints: 'work4' },
  ),
  call(
    'CreateTitle',
    {
      data: {
        canonical: true,
        fullTitle: 'A Nested Section',
        localeCode: 'EN',
        subtitle: null,
        title: 'A Nested Section',
        workId: minted('work4'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateWorkRelation',
    {
      data: {
        relatorWorkId: minted('work4'),
        relatedWorkId: minted('work1'),
        relationOrdinal: 3,
        relationType: 'IS_CHILD_OF',
      },
    },
    { unit: 1 },
  ),
  call(
    'CreateWork',
    workRow({
      workStatus: 'ACTIVE',
      imprintId: IMPRINT,
      workType: 'MONOGRAPH',
      edition: 1,
      publicationDate: '2026-03-01',
      pageBreakdown: 'nulla+0+nulla',
    }),
    { unit: 1, mints: 'work5' },
  ),
  call(
    'CreateTitle',
    {
      data: {
        canonical: true,
        fullTitle: 'An Embedded Work',
        localeCode: 'EN',
        subtitle: null,
        title: 'An Embedded Work',
        workId: minted('work5'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateSubject',
    { data: { subjectCode: 'DSBF', subjectType: 'THEMA', subjectOrdinal: 1, workId: minted('work5') } },
    { unit: 1 },
  ),
  call(
    'CreateSubject',
    { data: { subjectCode: 'DSBH', subjectType: 'THEMA', subjectOrdinal: 2, workId: minted('work5') } },
    { unit: 1 },
  ),
  call(
    'CreateWorkRelation',
    {
      data: {
        relatorWorkId: minted('work5'),
        relatedWorkId: minted('work1'),
        relationOrdinal: 3,
        relationType: 'IS_PART_OF',
      },
    },
    { unit: 1 },
  ),
  call(
    'CreateWork',
    workRow({
      workStatus: 'ACTIVE',
      imprintId: IMPRINT,
      workType: 'BOOK_CHAPTER',
      publicationDate: '2026-03-01',
      firstPage: '91',
      lastPage: '96',
      pageBreakdown: 'nulla+0+nulla',
    }),
    { unit: 1, mints: 'work6' },
  ),
  call(
    'CreateTitle',
    {
      data: {
        canonical: true,
        fullTitle: 'Index',
        localeCode: 'EN',
        subtitle: null,
        title: 'Index',
        workId: minted('work6'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateWorkRelation',
    {
      data: {
        relatorWorkId: minted('work6'),
        relatedWorkId: minted('work1'),
        relationOrdinal: 4,
        relationType: 'IS_CHILD_OF',
      },
    },
    { unit: 1 },
  ),
];

/**
 * `target-licence-usage-protection`, answered: unit 1 creates the licensed Work and its three Publications; unit 2 the
 * second Work, its Reference and PDF, then the one cross-Work relation it owns, between the two created ids.
 */
const LICENCE_TRANSCRIPT: readonly ExpectedCall[] = [
  call(
    'CreateWork',
    workRow({
      workStatus: 'ACTIVE',
      imprintId: IMPRINT,
      workType: 'MONOGRAPH',
      edition: 1,
      license: 'https://creativecommons.org/licenses/by/4.0/',
      doi: 'https://doi.org/10.5555/regression.d109a',
      publicationDate: '2026-03-01',
      pageBreakdown: 'nulla+0+nulla',
    }),
    { unit: 1, mints: 'work1' },
  ),
  call(
    'CreateTitle',
    {
      data: {
        canonical: true,
        fullTitle: 'Open Licences in Practice',
        localeCode: 'EN',
        subtitle: null,
        title: 'Open Licences in Practice',
        workId: minted('work1'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateLanguage',
    { data: { languageCode: 'ENG', languageRelation: 'ORIGINAL', workId: minted('work1') } },
    { unit: 1 },
  ),
  call('CreatePublication', publicationRow(minted('work1'), '9781800009011', 'PDF'), {
    unit: 1,
    mints: 'publication1',
  }),
  call('CreatePublication', publicationRow(minted('work1'), '9781800009028', 'EPUB'), {
    unit: 1,
    mints: 'publication2',
  }),
  call('CreatePublication', publicationRow(minted('work1'), '9781800009035', 'PAPERBACK'), {
    unit: 1,
    mints: 'publication3',
  }),
  call(
    'CreateWork',
    workRow({
      workStatus: 'ACTIVE',
      imprintId: IMPRINT,
      workType: 'MONOGRAPH',
      edition: 1,
      publicationDate: '2026-03-01',
      pageBreakdown: 'nulla+0+nulla',
    }),
    { unit: 2, mints: 'work2' },
  ),
  call(
    'CreateTitle',
    {
      data: {
        canonical: true,
        fullTitle: 'Restricted Reuse',
        localeCode: 'EN',
        subtitle: null,
        title: 'Restricted Reuse',
        workId: minted('work2'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 2 },
  ),
  call(
    'CreateLanguage',
    { data: { languageCode: 'ENG', languageRelation: 'ORIGINAL', workId: minted('work2') } },
    { unit: 2 },
  ),
  call(
    'CreateReference',
    {
      data: {
        doi: 'https://doi.org/10.5555/cited.0101',
        journalTitle: null,
        articleTitle: null,
        seriesTitle: null,
        volumeTitle: null,
        url: null,
        unstructuredCitation: null,
        referenceOrdinal: 1,
        isbn: null,
        issn: null,
        workId: minted('work2'),
      },
    },
    { unit: 2 },
  ),
  call('CreatePublication', publicationRow(minted('work2'), '9781800009042', 'PDF'), {
    unit: 2,
    mints: 'publication4',
  }),
  call(
    'CreateWorkRelation',
    {
      data: {
        relatorWorkId: minted('work2'),
        relatedWorkId: minted('work1'),
        relationOrdinal: 1,
        relationType: 'IS_PART_OF',
      },
    },
    { unit: 2 },
  ),
];

/**
 * `target-reviews-prizes-cited-content`, answered: the Work with a contributor it creates, its PDF and chapter, then both
 * BookReviews, the Endorsement and the Award - each whole, with its ordinal and markup format.
 */
const REVIEWS_TRANSCRIPT: readonly ExpectedCall[] = [
  call(
    'CreateWork',
    workRow({
      workStatus: 'ACTIVE',
      imprintId: IMPRINT,
      workType: 'MONOGRAPH',
      edition: 1,
      publicationDate: '2026-03-01',
      pageBreakdown: 'nulla+0+nulla',
    }),
    { unit: 1, mints: 'work1' },
  ),
  call(
    'CreateTitle',
    {
      data: {
        canonical: true,
        fullTitle: 'Praise and Prizes',
        localeCode: 'EN',
        subtitle: null,
        title: 'Praise and Prizes',
        workId: minted('work1'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateContributor',
    { data: { firstName: 'Grace', fullName: 'Grace Hopper', lastName: 'Hopper', orcid: null, website: null } },
    { unit: 1, mints: 'contributor1' },
  ),
  call(
    'CreateContribution',
    {
      data: {
        workId: minted('work1'),
        contributorId: minted('contributor1'),
        contributionType: 'AUTHOR',
        mainContribution: true,
        firstName: 'Grace',
        lastName: 'Hopper',
        fullName: 'Grace Hopper',
        contributionOrdinal: 1,
      },
    },
    { unit: 1, mints: 'contribution1' },
  ),
  call(
    'CreateLanguage',
    { data: { languageCode: 'ENG', languageRelation: 'ORIGINAL', workId: minted('work1') } },
    { unit: 1 },
  ),
  call('CreatePublication', publicationRow(minted('work1'), '9781800011014', 'PDF'), {
    unit: 1,
    mints: 'publication1',
  }),
  call(
    'CreateWork',
    workRow({
      workStatus: 'ACTIVE',
      imprintId: IMPRINT,
      workType: 'BOOK_CHAPTER',
      publicationDate: '2026-03-01',
      firstPage: '1',
      lastPage: '40',
      pageBreakdown: 'nulla+0+nulla',
    }),
    { unit: 1, mints: 'work2' },
  ),
  call(
    'CreateTitle',
    {
      data: {
        canonical: true,
        fullTitle: 'A Reviewed Chapter',
        localeCode: 'EN',
        subtitle: null,
        title: 'A Reviewed Chapter',
        workId: minted('work2'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateWorkRelation',
    {
      data: {
        relatorWorkId: minted('work2'),
        relatedWorkId: minted('work1'),
        relationOrdinal: 1,
        relationType: 'IS_CHILD_OF',
      },
    },
    { unit: 1 },
  ),
  call(
    'CreateBookReview',
    {
      data: {
        workId: minted('work1'),
        title: null,
        authorName: 'Reviewer One',
        reviewerOrcid: null,
        reviewerInstitutionId: null,
        url: null,
        doi: null,
        reviewDate: '2026-04-01',
        journalName: null,
        journalVolume: null,
        journalNumber: null,
        journalIssn: null,
        pageRange: null,
        text: '<p>A <em>superb</em> account of regression.</p>',
        reviewOrdinal: 1,
      },
      markupFormat: 'HTML',
    },
    { unit: 1 },
  ),
  call(
    'CreateBookReview',
    {
      data: {
        workId: minted('work1'),
        title: null,
        authorName: null,
        reviewerOrcid: null,
        reviewerInstitutionId: null,
        url: 'https://reviews.example/fixture-review/praise-and-prizes',
        doi: null,
        reviewDate: '2026-04-15',
        journalName: null,
        journalVolume: null,
        journalNumber: null,
        journalIssn: null,
        pageRange: null,
        text: null,
        reviewOrdinal: 2,
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateEndorsement',
    {
      data: {
        workId: minted('work1'),
        authorName: 'Endorser Two',
        authorOrcid: null,
        authorRole: null,
        authorInstitutionId: null,
        url: 'https://endorsers.example/endorser-two',
        text: 'Indispensable for anyone who imports metadata.',
        endorsementOrdinal: 2,
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateAward',
    {
      data: {
        workId: minted('work1'),
        title: 'Regression Book of the Year',
        url: null,
        category: null,
        prizeStatement: null,
        role: 'SHORT_LISTED',
        awardOrdinal: 1,
        jury: 'Ada Lovelace, Alan Turing',
        year: '2026',
        country: 'GBR',
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
];

/**
 * `target-subject-matrix`, answered: the Work with every subject in its type's order, its language and PDF, then the
 * proposed Series - created the first time a unit needs it - and the Work's issue in it.
 */
const SUBJECTS_TRANSCRIPT: readonly ExpectedCall[] = [
  call(
    'CreateWork',
    workRow({
      workStatus: 'ACTIVE',
      imprintId: IMPRINT,
      workType: 'MONOGRAPH',
      edition: 1,
      publicationDate: '2026-03-01',
      pageBreakdown: 'nulla+0+nulla',
    }),
    { unit: 1, mints: 'work1' },
  ),
  call(
    'CreateTitle',
    {
      data: {
        canonical: true,
        fullTitle: 'Subjects in Every Scheme',
        localeCode: 'EN',
        subtitle: null,
        title: 'Subjects in Every Scheme',
        workId: minted('work1'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateSubject',
    { data: { subjectCode: 'PN1009.A1', subjectType: 'LCC', subjectOrdinal: 1, workId: minted('work1') } },
    { unit: 1 },
  ),
  call(
    'CreateSubject',
    { data: { subjectCode: 'LIT004130', subjectType: 'BISAC', subjectOrdinal: 1, workId: minted('work1') } },
    { unit: 1 },
  ),
  call(
    'CreateSubject',
    { data: { subjectCode: 'LAN009000', subjectType: 'BISAC', subjectOrdinal: 2, workId: minted('work1') } },
    { unit: 1 },
  ),
  call(
    'CreateSubject',
    { data: { subjectCode: 'DSB', subjectType: 'BIC', subjectOrdinal: 1, workId: minted('work1') } },
    { unit: 1 },
  ),
  call(
    'CreateSubject',
    { data: { subjectCode: 'DSBF', subjectType: 'THEMA', subjectOrdinal: 1, workId: minted('work1') } },
    { unit: 1 },
  ),
  call(
    'CreateSubject',
    { data: { subjectCode: 'DSBH', subjectType: 'THEMA', subjectOrdinal: 2, workId: minted('work1') } },
    { unit: 1 },
  ),
  call(
    'CreateSubject',
    { data: { subjectCode: 'literary theory', subjectType: 'KEYWORD', subjectOrdinal: 1, workId: minted('work1') } },
    { unit: 1 },
  ),
  call(
    'CreateSubject',
    { data: { subjectCode: 'reading', subjectType: 'KEYWORD', subjectOrdinal: 2, workId: minted('work1') } },
    { unit: 1 },
  ),
  call(
    'CreateSubject',
    { data: { subjectCode: 'criticism', subjectType: 'KEYWORD', subjectOrdinal: 3, workId: minted('work1') } },
    { unit: 1 },
  ),
  call(
    'CreateSubject',
    { data: { subjectCode: 'REG-LIT', subjectType: 'CUSTOM', subjectOrdinal: 1, workId: minted('work1') } },
    { unit: 1 },
  ),
  call(
    'CreateLanguage',
    { data: { languageCode: 'ENG', languageRelation: 'ORIGINAL', workId: minted('work1') } },
    { unit: 1 },
  ),
  call('CreatePublication', publicationRow(minted('work1'), '9781800004016', 'PDF'), {
    unit: 1,
    mints: 'publication1',
  }),
  call(
    'CreateSeries',
    {
      data: {
        seriesName: 'Subjects in Series',
        seriesType: 'BOOK_SERIES',
        issnPrint: null,
        issnDigital: '0317-8471',
        imprintId: IMPRINT,
        seriesUrl: null,
        seriesCfpUrl: null,
        seriesDescription: null,
      },
    },
    { unit: 1, mints: 'series1' },
  ),
  call(
    'CreateIssue',
    { data: { issueOrdinal: 4, seriesId: minted('series1'), workId: minted('work1'), issueNumber: 4 } },
    { unit: 1 },
  ),
];

/**
 * `target-collateral-resources`, answered: the Work with its cover, caption and general note, both abstracts, its language
 * and PDF, then its two AdditionalResources at their planned ordinals.
 */
const COLLATERAL_TRANSCRIPT: readonly ExpectedCall[] = [
  call(
    'CreateWork',
    workRow({
      workStatus: 'ACTIVE',
      imprintId: IMPRINT,
      workType: 'MONOGRAPH',
      edition: 1,
      generalNote: 'Published with the support of the Regression Fund.',
      coverUrl: 'https://regression-press.example/covers/collateral.jpg',
      coverCaption: 'An empty shelf under a window.',
      publicationDate: '2026-03-01',
      pageBreakdown: 'nulla+0+nulla',
    }),
    { unit: 1, mints: 'work1' },
  ),
  call(
    'CreateTitle',
    {
      data: {
        canonical: true,
        fullTitle: 'Collateral in Every Form',
        localeCode: 'EN',
        subtitle: null,
        title: 'Collateral in Every Form',
        workId: minted('work1'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateAbstract',
    {
      data: {
        abstractType: 'SHORT',
        canonical: true,
        content: 'Resources that travel with a book.',
        localeCode: 'EN',
        workId: minted('work1'),
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateAbstract',
    {
      data: {
        abstractType: 'LONG',
        canonical: true,
        content: '<p>A long description of the <em>collateral</em> a book carries.</p>',
        localeCode: 'EN',
        workId: minted('work1'),
      },
      markupFormat: 'HTML',
    },
    { unit: 1 },
  ),
  call(
    'CreateLanguage',
    { data: { languageCode: 'ENG', languageRelation: 'ORIGINAL', workId: minted('work1') } },
    { unit: 1 },
  ),
  call('CreatePublication', publicationRow(minted('work1'), '9781800008014', 'PDF'), {
    unit: 1,
    mints: 'publication1',
  }),
  call(
    'CreateAdditionalResource',
    {
      data: {
        workId: minted('work1'),
        title: 'Trailer',
        description: null,
        attribution: null,
        resourceType: 'VIDEO',
        doi: null,
        handle: null,
        url: 'https://video.regression-press.example/trailers/collateral',
        date: null,
        resourceOrdinal: 1,
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
  call(
    'CreateAdditionalResource',
    {
      data: {
        workId: minted('work1'),
        title: 'Table of contents',
        description: null,
        attribution: null,
        resourceType: 'DOCUMENT',
        doi: null,
        handle: null,
        url: 'https://regression-press.example/files/collateral-contents.pdf',
        date: null,
        resourceOrdinal: 2,
      },
      markupFormat: 'PLAIN_TEXT',
    },
    { unit: 1 },
  ),
];

/** A compensating delete of the Work or Publication created by the labelled call, sent by the failed unit. */
const deleteWork = (label: string, unit: number) => call('DeleteWork', { workId: minted(label) }, { unit });
const deletePublication = (label: string, unit: number) =>
  call('DeletePublication', { publicationId: minted(label) }, { unit });

/** A failed run, exactly: the confirmed run up to and including the write at `index`, then the failed unit's compensation. */
const failing = (
  transcript: readonly ExpectedCall[],
  index: number,
  compensation: readonly ExpectedCall[] = [],
): readonly ExpectedCall[] => [...transcript.slice(0, index + 1), ...compensation];

/** The API failing the write at `index` of a transcript, by its operation and occurrence. */
const faultAt = (transcript: readonly ExpectedCall[], index: number, fault: Fault): Faults => {
  const { operation } = transcript[index];
  const occurrence = transcript.slice(0, index + 1).filter((expected) => expected.operation === operation).length;

  return { [operation]: { [occurrence]: fault } };
};

/** The position of the `occurrence`-th call of an operation in a transcript (0-based). */
const indexOf = (transcript: readonly ExpectedCall[], operation: string, occurrence = 1): number =>
  transcript.findIndex(
    (expected, index) =>
      expected.operation === operation &&
      transcript.slice(0, index + 1).filter((earlier) => earlier.operation === operation).length === occurrence,
  );

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
      const transport = new AdversarialTransport(new Set([EXISTING_WORK]), [
        call('CreateWork', workRow(ENRICHMENT_NEW_WORK), { unit: 0 }),
      ]);

      await expect(
        transport.mutation(CREATE_PUBLICATION, publicationRow(EXISTING_WORK, '9781800060036', 'EPUB')),
      ).rejects.toThrow('call 1: CreatePublication sent where the confirmed run sends CreateWork');
      expect(transport.violations).toHaveLength(1);
    });

    it('refuses, as it is sent, a call whose complete variables or unit differ in any value from the expected call', async () => {
      const [epub] = ENRICHMENT_TRANSCRIPT;
      const differing = new AdversarialTransport(new Set([EXISTING_WORK]), [epub]);
      const fromAnotherUnit = new AdversarialTransport(new Set([EXISTING_WORK]), [epub]);
      const withAnExtraField = new AdversarialTransport(new Set([EXISTING_WORK]), [epub]);
      const variables = publicationRow(EXISTING_WORK, '9781800060036', 'EPUB');

      differing.unit = 1;
      fromAnotherUnit.unit = 2;
      withAnExtraField.unit = 1;

      await expect(
        differing.mutation(CREATE_PUBLICATION, publicationRow(EXISTING_WORK, '9781800060036', 'PDF')),
      ).rejects.toThrow('call 1 (CreatePublication): variables differ from the confirmed run');
      await expect(fromAnotherUnit.mutation(CREATE_PUBLICATION, variables)).rejects.toThrow(
        'sent by unit 2, where the confirmed run sends it from unit 1',
      );
      await expect(
        withAnExtraField.mutation(CREATE_PUBLICATION, { data: { ...variables.data, widthMm: 210 } }),
      ).rejects.toThrow('variables differ from the confirmed run');
    });

    it('binds a created id by label, refuses a call beyond the transcript, and reports an expected call never sent', async () => {
      const [epub, price] = ENRICHMENT_TRANSCRIPT;
      const transport = new AdversarialTransport(new Set([EXISTING_WORK]), [epub, price, ENRICHMENT_TRANSCRIPT[2]]);
      const { CREATE_PRICE } = await import('@/src/entities/price/model/price.schema');

      transport.unit = 1;
      const created = (await transport.mutation(
        CREATE_PUBLICATION,
        publicationRow(EXISTING_WORK, '9781800060036', 'EPUB'),
      )) as {
        createPublication: { publicationId: string };
      };
      // The label resolves to whatever id was minted: a Price naming any other Publication is refused.
      await expect(
        transport.mutation(CREATE_PRICE, {
          data: { currencyCode: 'EUR', unitPrice: 12, publicationId: 'publication-0' },
        }),
      ).rejects.toThrow('variables differ from the confirmed run');
      transport.settle();

      expect(created.createPublication.publicationId).toBe('publication-1');
      expect(transport.violations.slice(1)).toStrictEqual([
        'call 3 (CreateLocation) of the confirmed run was never sent',
      ]);

      const beyond = new AdversarialTransport(new Set([EXISTING_WORK]), []);
      await expect(
        beyond.mutation(CREATE_PUBLICATION, publicationRow(EXISTING_WORK, '9781800060036', 'EPUB')),
      ).rejects.toThrow('call 1 (CreatePublication) is beyond the 0 calls of the confirmed run');
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
      const { transport, error } = await execute(supplyPlan, heldBy(supply, 1), SUPPLY_TRANSCRIPT);

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

      // The run the altered plan confirms: the same calls, with exactly the two values it now holds.
      const confirmed = ENRICHMENT_TRANSCRIPT.map((expected, index) =>
        index === indexOf(ENRICHMENT_TRANSCRIPT, 'CreatePrice')
          ? call(
              'CreatePrice',
              { data: { currencyCode: 'EUR', unitPrice: 99, publicationId: minted('publication1') } },
              { unit: 1 },
            )
          : index === indexOf(ENRICHMENT_TRANSCRIPT, 'CreateWork')
            ? call(
                'CreateWork',
                workRow({ ...ENRICHMENT_NEW_WORK, doi: 'https://doi.org/10.5555/confirmed.elsewhere' }),
                { unit: 2, mints: 'work1' },
              )
            : expected,
      );
      const { transport } = await execute(altered, heldBy(existingEnrichment, 1), confirmed);

      expect(transport.violations).toStrictEqual([]);
      expect(transport.sent('CreatePrice')[0]).toMatchObject({ data: { currencyCode: 'EUR', unitPrice: 99 } });
      expect(transport.sent('CreateWork')[0]).toMatchObject({
        data: { doi: 'https://doi.org/10.5555/confirmed.elsewhere' },
      });
    });

    it('turns no warning and no unrepresentable fact into a write', async () => {
      const { transport } = await execute(enrichment, heldBy(existingEnrichment, 1), ENRICHMENT_TRANSCRIPT);
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
      const supplied = await execute(supplyPlan, heldBy(supply, 1), SUPPLY_TRANSCRIPT);
      expect(supplied.transport.violations).toStrictEqual([]);
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
      const { transport, error } = await execute(mixed, heldBy(existingEnrichment, 1), []);

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

      const { transport, error } = await execute(malformed, heldBy(existingEnrichment, 1), []);

      expect(transport.calls).toStrictEqual([]);
      expect(error?.context.cleanup?.status).toBe('NOT_REQUIRED');
    });
  });

  /* ---------------------------------------------------------------------------------------------- */

  describe('execution units and stage order (#187)', () => {
    it('runs a NOOP unit as a unit: it sends nothing, and completes', async () => {
      const { transport, progress, error } = await execute(noop, heldBy(existingNoop), []);

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
        ENRICHMENT_TRANSCRIPT,
      );

      expect(error).toBeNull();
      expect(transport.violations).toStrictEqual([]);
      expect(enrichment).toStrictEqual(before);
      expect(transport.operations()).toStrictEqual(ENRICHMENT_TRANSCRIPT.map(({ operation }) => operation));
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
      const { transport, error } = await execute(supplyPlan, heldBy(supply, 1), SUPPLY_TRANSCRIPT);

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
      const { transport, progress, error } = await execute(
        componentsPlan,
        heldBy(components, 3),
        COMPONENTS_TRANSCRIPT,
      );

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
      const { transport, error } = await execute(licencePlan, heldBy(licence, 1), LICENCE_TRANSCRIPT);
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
      const { transport, progress, error } = await execute(reviewsPlan, heldBy(reviews, 1), REVIEWS_TRANSCRIPT);
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
      const { transport, error } = await execute(subjectsPlan, heldBy(subjects, 1), SUBJECTS_TRANSCRIPT);
      const [membership] = subjectsPlan.series[0].members;

      expect(error).toBeNull();
      expect(transport.violations).toStrictEqual([]);
      expect(transport.operations().slice(-2)).toStrictEqual(['CreateSeries', 'CreateIssue']);
      expect(transport.sent('CreateIssue')[0]).toMatchObject({
        data: { issueOrdinal: membership.orderNumber, issueNumber: membership.issueNumber },
      });
    });

    it('creates each AdditionalResource under its Work at its planned ordinal', async () => {
      const { transport, error } = await execute(collateralPlan, heldBy(collateral, 1), COLLATERAL_TRANSCRIPT);
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

  describe('every confirmed value is held call by call, as it is sent', () => {
    type Corruption = {
      readonly name: string;
      readonly plan: () => ImportPlan;
      readonly fixture: OnixRegressionFixture;
      readonly scenario: number;
      readonly transcript: () => readonly ExpectedCall[];
      /** One confirmed plan-owned value changed after confirmation, where nothing but the plan holds it. */
      readonly corrupt: (plan: ImportPlan) => void;
      readonly operation: string;
      readonly occurrence: number;
      readonly position: number;
      readonly stage: string;
    };

    /** The `kind` action of the first unit of a plan, with its payload, for a corruption to change. */
    const actionOf = <K extends ImportExecutionAction['kind']>(plan: ImportPlan, kind: K, occurrence = 1) => {
      const found = (plan.execution?.units ?? [])
        .flatMap(({ actions }) => actions)
        .filter((action): action is Extract<ImportExecutionAction, { kind: K }> => action.kind === kind)[
        occurrence - 1
      ];
      if (found === undefined) throw new Error(`the plan holds no ${kind} ${occurrence}`);

      return found;
    };

    const CORRUPTIONS: readonly Corruption[] = [
      {
        name: 'a BookReview’s text',
        plan: () => reviewsPlan,
        fixture: reviews,
        scenario: 1,
        transcript: () => REVIEWS_TRANSCRIPT,
        corrupt: (plan) =>
          Object.assign(actionOf(plan, 'CREATE_BOOK_REVIEW').review, { text: '<p>A dull account.</p>' }),
        operation: 'CreateBookReview',
        occurrence: 1,
        position: 1,
        stage: 'bookReview',
      },
      {
        name: 'an Endorsement’s text',
        plan: () => reviewsPlan,
        fixture: reviews,
        scenario: 1,
        transcript: () => REVIEWS_TRANSCRIPT,
        corrupt: (plan) => Object.assign(actionOf(plan, 'CREATE_ENDORSEMENT').endorsement, { text: 'Dispensable.' }),
        operation: 'CreateEndorsement',
        occurrence: 1,
        position: 1,
        stage: 'endorsement',
      },
      {
        name: 'an Award’s year',
        plan: () => reviewsPlan,
        fixture: reviews,
        scenario: 1,
        transcript: () => REVIEWS_TRANSCRIPT,
        corrupt: (plan) => Object.assign(actionOf(plan, 'CREATE_AWARD').award, { year: '1999' }),
        operation: 'CreateAward',
        occurrence: 1,
        position: 1,
        stage: 'award',
      },
      {
        name: 'an AdditionalResource’s URL',
        plan: () => collateralPlan,
        fixture: collateral,
        scenario: 1,
        transcript: () => COLLATERAL_TRANSCRIPT,
        corrupt: (plan) =>
          Object.assign(actionOf(plan, 'CREATE_ADDITIONAL_RESOURCE', 2).resource, {
            url: 'https://elsewhere.example/contents.pdf',
          }),
        operation: 'CreateAdditionalResource',
        occurrence: 2,
        position: 1,
        stage: 'additionalResource',
      },
      {
        name: 'a subject code',
        plan: () => subjectsPlan,
        fixture: subjects,
        scenario: 1,
        transcript: () => SUBJECTS_TRANSCRIPT,
        corrupt: (plan) => Object.assign(plan.works[0].subjects[1], { code: 'LIT000000' }),
        operation: 'CreateSubject',
        occurrence: 2,
        position: 1,
        stage: 'work',
      },
      {
        name: 'a chapter’s last page',
        plan: () => componentsPlan,
        fixture: components,
        scenario: 3,
        transcript: () => COMPONENTS_TRANSCRIPT,
        corrupt: (plan) => Object.assign(plan.chapters[0], { lastPage: '9' }),
        operation: 'CreateWork',
        occurrence: 2,
        position: 1,
        stage: 'chapter',
      },
      {
        name: 'a contained Work’s title',
        plan: () => componentsPlan,
        fixture: components,
        scenario: 3,
        transcript: () => COMPONENTS_TRANSCRIPT,
        corrupt: (plan) => Object.assign((plan.containedWorks ?? [])[0].titles[0], { title: 'Another Embedded Work' }),
        operation: 'CreateTitle',
        occurrence: 5,
        position: 1,
        stage: 'containedWork',
      },
      {
        name: 'a Reference’s DOI',
        plan: () => licencePlan,
        fixture: licence,
        scenario: 1,
        transcript: () => LICENCE_TRANSCRIPT,
        corrupt: (plan) => Object.assign(plan.works[1].references[0], { doi: 'https://doi.org/10.5555/cited.0102' }),
        operation: 'CreateReference',
        occurrence: 1,
        position: 2,
        stage: 'work',
      },
      {
        name: 'a proposed Series’ ISSN',
        plan: () => subjectsPlan,
        fixture: subjects,
        scenario: 1,
        transcript: () => SUBJECTS_TRANSCRIPT,
        corrupt: (plan) => {
          const { target } = plan.series[0];
          if (target.kind !== 'proposed') throw new Error('the subject-matrix Series is no longer proposed');
          Object.assign(target.series, { issnDigital: '2049-3630' });
        },
        operation: 'CreateSeries',
        occurrence: 1,
        position: 1,
        stage: 'series',
      },
    ];

    it.each(CORRUPTIONS.map((corruption) => [corruption.name, corruption] as const))(
      'rejects %s changed after confirmation at the exact call that sends it',
      async (_name, corruption) => {
        const transcript = corruption.transcript();
        const corrupted = structuredClone(corruption.plan());
        corruption.corrupt(corrupted);

        const at = indexOf(transcript, corruption.operation, corruption.occurrence);
        const { transport, error } = await execute(
          corrupted,
          heldBy(corruption.fixture, corruption.scenario),
          transcript,
        );

        // Every call before it matched exactly; the corrupted one is refused as it is sent, and the run stops there:
        // only the rest of its own family, already sent with it (subjects are created together), then compensation.
        expect(at).toBeGreaterThanOrEqual(0);
        expect(transport.violations[0]).toMatch(
          new RegExp(`^call ${at + 1} \\(${corruption.operation}\\): variables differ from the confirmed run`),
        );
        expect(transport.calls[at].operation).toBe(corruption.operation);
        transport.calls
          .slice(at + 1)
          .forEach(({ operation }) =>
            expect(operation === corruption.operation || DELETES[operation] !== undefined).toBe(true),
          );
        expect(error?.context).toMatchObject({ current: { position: corruption.position }, stage: corruption.stage });
      },
    );

    it('rejects a reordered run without an existing Work at its first reordered write, as it is sent', async () => {
      const reordered = structuredClone(componentsPlan);
      const [unit] = reordered.execution?.units ?? [];
      const first = unit.actions.findIndex(({ kind }) => kind === 'CREATE_CHAPTER');
      const second = unit.actions.findIndex((action, index) => index > first && action.kind === 'CREATE_CHAPTER');
      const actions = [...unit.actions];
      [actions[first], actions[second]] = [actions[second], actions[first]];
      Object.assign(unit, { actions });

      const { transport, error } = await execute(reordered, heldBy(components, 3), COMPONENTS_TRANSCRIPT);
      const at = indexOf(COMPONENTS_TRANSCRIPT, 'CreateWork', 2);

      // The second chapter is now sent where the first is confirmed: refused there, before anything after it.
      expect(transport.violations[0]).toMatch(
        new RegExp(`^call ${at + 1} \\(CreateWork\\): variables differ from the confirmed run`),
      );
      expect(transport.calls[at].variables).toMatchObject({ data: { firstPage: '9', lastPage: '30' } });
      transport.calls.slice(at + 1).forEach(({ operation }) => expect(DELETES[operation]).toBeDefined());
      expect(error?.context.stage).toBe('chapter');
    });
  });

  /* ---------------------------------------------------------------------------------------------- */

  describe('failure context, compensation and retry truthfulness (#187)', () => {
    type Case = {
      readonly name: string;
      readonly plan: () => ImportPlan;
      readonly fixture: OnixRegressionFixture;
      readonly scenario: number;
      /** The confirmed run, the write in it the API fails, and the failed unit's compensation, newest first. */
      readonly transcript: readonly ExpectedCall[];
      readonly failAt: number;
      readonly compensation: readonly ExpectedCall[];
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
        transcript: ENRICHMENT_TRANSCRIPT,
        failAt: indexOf(ENRICHMENT_TRANSCRIPT, 'CreateLocation', 2),
        compensation: [deletePublication('publication1', 1)],
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
        transcript: ENRICHMENT_TRANSCRIPT,
        failAt: indexOf(ENRICHMENT_TRANSCRIPT, 'CreateAffiliation'),
        compensation: [deleteWork('work1', 2)],
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
        transcript: ENRICHMENT_TRANSCRIPT,
        failAt: indexOf(ENRICHMENT_TRANSCRIPT, 'CreatePublication', 2),
        compensation: [deleteWork('work1', 2)],
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
        transcript: COMPONENTS_TRANSCRIPT,
        failAt: indexOf(COMPONENTS_TRANSCRIPT, 'CreateWorkRelation', 4),
        compensation: ['work5', 'work4', 'work3', 'work2', 'work1'].map((label) => deleteWork(label, 1)),
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
        transcript: COMPONENTS_TRANSCRIPT,
        failAt: indexOf(COMPONENTS_TRANSCRIPT, 'CreateWorkRelation', 2),
        compensation: ['work3', 'work2', 'work1'].map((label) => deleteWork(label, 1)),
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
        transcript: LICENCE_TRANSCRIPT,
        failAt: indexOf(LICENCE_TRANSCRIPT, 'CreateWorkRelation'),
        compensation: [deleteWork('work2', 2)],
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
        transcript: REVIEWS_TRANSCRIPT,
        failAt: indexOf(REVIEWS_TRANSCRIPT, 'CreateBookReview', 2),
        compensation: [deleteWork('work2', 1), deleteWork('work1', 1)],
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
        transcript: REVIEWS_TRANSCRIPT,
        failAt: indexOf(REVIEWS_TRANSCRIPT, 'CreateEndorsement'),
        compensation: [deleteWork('work2', 1), deleteWork('work1', 1)],
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
        transcript: REVIEWS_TRANSCRIPT,
        failAt: indexOf(REVIEWS_TRANSCRIPT, 'CreateAward'),
        compensation: [deleteWork('work2', 1), deleteWork('work1', 1)],
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
        transcript: SUBJECTS_TRANSCRIPT,
        failAt: indexOf(SUBJECTS_TRANSCRIPT, 'CreateIssue'),
        compensation: [deleteWork('work1', 1)],
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
        transcript: COLLATERAL_TRANSCRIPT,
        failAt: indexOf(COLLATERAL_TRANSCRIPT, 'CreateAdditionalResource', 2),
        compensation: [deleteWork('work1', 1)],
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
        const { transport, error } = await execute(
          plan,
          heldBy(testCase.fixture, testCase.scenario),
          failing(testCase.transcript, testCase.failAt, testCase.compensation),
          faultAt(testCase.transcript, testCase.failAt, 'THROW'),
        );
        const failedAt = testCase.failAt;

        // Every call up to the failed write, and every compensating delete after it, exactly as stated.
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
      const failAt = indexOf(ENRICHMENT_TRANSCRIPT, 'CreateLocation', 2);
      const { transport, error } = await execute(
        enrichment,
        heldBy(existingEnrichment, 1),
        failing(ENRICHMENT_TRANSCRIPT, failAt, [deletePublication('publication1', 1)]),
        faultAt(ENRICHMENT_TRANSCRIPT, failAt, 'THROW'),
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
      const failAt = indexOf(ENRICHMENT_TRANSCRIPT, 'CreatePublication', 2);
      const { transport, error } = await execute(
        enrichment,
        heldBy(existingEnrichment, 1),
        failing(ENRICHMENT_TRANSCRIPT, failAt, [deleteWork('work1', 2)]),
        faultAt(ENRICHMENT_TRANSCRIPT, failAt, 'THROW'),
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
      const failAt = indexOf(REVIEWS_TRANSCRIPT, 'CreateAward');
      const { transport, error } = await execute(
        reviewsPlan,
        heldBy(reviews, 1),
        failing(REVIEWS_TRANSCRIPT, failAt, [deleteWork('work2', 1), deleteWork('work1', 1)]),
        faultAt(REVIEWS_TRANSCRIPT, failAt, 'THROW'),
      );
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
      const failAt = indexOf(SUBJECTS_TRANSCRIPT, 'CreateIssue');
      const { transport, error } = await execute(
        subjectsPlan,
        heldBy(subjects, 1),
        failing(SUBJECTS_TRANSCRIPT, failAt, [deleteWork('work1', 1)]),
        faultAt(SUBJECTS_TRANSCRIPT, failAt, 'THROW'),
      );
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
        const { transport, error } = await execute(
          enrichment,
          heldBy(existingEnrichment, 1),
          failing(ENRICHMENT_TRANSCRIPT, 0),
          faultAt(ENRICHMENT_TRANSCRIPT, 0, fault),
        );
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
      const failAt = indexOf(ENRICHMENT_TRANSCRIPT, 'CreateLocation', 2);
      const { transport, error } = await execute(
        enrichment,
        heldBy(existingEnrichment, 1),
        failing(ENRICHMENT_TRANSCRIPT, failAt, [deletePublication('publication1', 1)]),
        { ...faultAt(ENRICHMENT_TRANSCRIPT, failAt, 'THROW'), DeletePublication: { 1: fault } },
      );
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
