import { parse } from '@5stones/onix';
import { describe, expect, it } from 'vitest';

import { currencyOptions, languageOptions, licenseOptions, WorkTypes } from '@/src/shared/constants';
import type { ExtendedONIXMessageRoot } from '@/src/shared/parsers/XMLParser/interfaces';
import { reduceOnixAccessibility } from '@/src/shared/parsers/XMLParser/onixAccessibility';
import { reduceOnixCollateral } from '@/src/shared/parsers/XMLParser/onixCollateral';
import { reduceOnixCommercial } from '@/src/shared/parsers/XMLParser/onixCommercial';
import { reduceOnixComponents } from '@/src/shared/parsers/XMLParser/onixComponents';
import { type OnixDescriptivePlan, reduceOnixDescriptive } from '@/src/shared/parsers/XMLParser/onixDescriptive';
import { planOnixSource } from '@/src/shared/parsers/XMLParser/onixPlanning';
import { reduceOnixRelatedMaterial } from '@/src/shared/parsers/XMLParser/onixRelations';
import { reduceOnixReviewsPrizes } from '@/src/shared/parsers/XMLParser/onixReviewsPrizes';
import { reduceOnixRights } from '@/src/shared/parsers/XMLParser/onixRights';
import { reduceOnixSalesRights } from '@/src/shared/parsers/XMLParser/onixSalesRights';
import {
  adaptableGroupKeys,
  EMPTY_ONIX_PLAN_INPUTS,
  type OnixTargetLookup,
  resolveOnixImportPlan,
  resolveOnixTargets,
} from '@/src/shared/parsers/XMLParser/onixTargetResolution';
import XMLParser from '@/src/shared/parsers/XMLParser/XMLParser';
import type {
  ImportPlan,
  OnixImportPlanSidecar,
  OnixPlanBlocker,
  OnixPlanInputs,
  OnixTargetEvidence,
} from '@/src/shared/types';
import { getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

import {
  answerReviewTask,
  buildImportReviewModel,
  filterReviewWorks,
  type OnixReviewTask,
  pendingReviewTasks,
} from './reviewModel';

const REFERENCE_NS = 'http://ns.editeur.org/onix/3.0/reference';
const IMPRINTS = [{ label: 'Example Imprint', value: 'imprint-1' }];
const ISBN_A = '9781800000018';
const ISBN_B = '9781800000025';
const GENERIC_HEADER =
  '<Header><Sender><SenderName>Example Press</SenderName></Sender><SentDateTime>20260913T1200</SentDateTime></Header>';
const { EditedBook, Monograph, Textbook, JournalIssue } = WorkTypes.enum;

const MINIMAL_TITLE =
  '<TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText language="eng">A Work</TitleText></TitleElement></TitleDetail>';

const isbn = (value: string) =>
  `<ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>${value}</IDValue></ProductIdentifier>`;

const onixRecord = ({
  ref,
  identifiers = '',
  descriptive = '<ProductForm>BC</ProductForm>',
  publishing = '<PublishingStatus>02</PublishingStatus>',
  related = '',
  collateral = '',
  tail = '',
}: {
  ref: string;
  identifiers?: string;
  descriptive?: string;
  publishing?: string;
  related?: string;
  collateral?: string;
  tail?: string;
}) =>
  `<Product><RecordReference>${ref}</RecordReference><NotificationType>03</NotificationType>${identifiers}` +
  `<DescriptiveDetail>${descriptive}${descriptive.includes('<TitleDetail>') ? '' : MINIMAL_TITLE}</DescriptiveDetail>${collateral}` +
  `<PublishingDetail><Imprint><ImprintName>Example Imprint</ImprintName></Imprint>${publishing}</PublishingDetail>` +
  `${related ? `<RelatedMaterial>${related}</RelatedMaterial>` : ''}${tail}</Product>`;

const noMatches: OnixTargetLookup = {
  findWorks: async () => new Map(),
  getWork: async (workId) => {
    throw new Error(`unexpected getWork(${workId})`);
  },
};

/** Everything the real planner, reductions and resolver produce for a file: the sidecar, and what XMLParse keeps beside it. */
const planFile = async (records: string[], inputs: Partial<OnixPlanInputs> = {}) => {
  const message = parse(
    `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">${GENERIC_HEADER}${records.join('')}</ONIXMessage>`,
  ) as ExtendedONIXMessageRoot;
  const sourcePlan = planOnixSource(message);
  const targets = await resolveOnixTargets(sourcePlan, noMatches, 'publisher-1');
  const descriptive = reduceOnixDescriptive(message, sourcePlan);
  const rights = reduceOnixRights(message, sourcePlan);
  const commercial = reduceOnixCommercial(message, sourcePlan);
  const collateral = reduceOnixCollateral(message, sourcePlan, { descriptive });
  const resolve = (next: Partial<OnixPlanInputs>) =>
    resolveOnixImportPlan({
      sourcePlan,
      targets,
      inputs: { ...EMPTY_ONIX_PLAN_INPUTS, ...next },
      imprints: IMPRINTS,
      descriptive,
      rights,
      commercial,
      accessibility: reduceOnixAccessibility(message, sourcePlan, { rights }),
      components: reduceOnixComponents(message, sourcePlan),
      salesRights: reduceOnixSalesRights(message, sourcePlan, { commercial }),
      relatedMaterial: reduceOnixRelatedMaterial(message, sourcePlan),
      collateral,
      reviewsPrizes: reduceOnixReviewsPrizes(message, sourcePlan, collateral),
      serieses: [],
    });

  return { sidecar: resolve(inputs).sidecar, resolve, descriptive, targets };
};

const paperback = [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A) })];

const supplied = (prices: string) =>
  onixRecord({
    ref: 'pb',
    identifiers: isbn(ISBN_A),
    tail:
      '<ProductSupply><SupplyDetail><Supplier><SupplierRole>01</SupplierRole><SupplierName>A Supplier</SupplierName></Supplier>' +
      `<ProductAvailability>20</ProductAvailability>${prices}</SupplyDetail></ProductSupply>`,
  });
const gbp = (amount: string, qualifier = '') =>
  `<Price><PriceType>02</PriceType>${qualifier}<PriceAmount>${amount}</PriceAmount><CurrencyCode>GBP</CurrencyCode></Price>`;

const requiredPending = (tasks: readonly OnixReviewTask[]) => pendingReviewTasks(tasks).map(({ key }) => key);

describe('buildImportReviewModel', () => {
  it('projects one grouped Work of several manifestations as one Work review, with a WorkType proposal as a confirmation', async () => {
    const editor =
      '<Contributor><SequenceNumber>1</SequenceNumber><ContributorRole>B01</ContributorRole><PersonName>Alex Example</PersonName>' +
      '<NamesBeforeKey>Alex</NamesBeforeKey><KeyNames>Example</KeyNames><BiographicalNote textformat="06">Alex writes.</BiographicalNote></Contributor>';
    const isbns = [ISBN_A, ISBN_B];
    const forms = ['<ProductForm>BB</ProductForm>', '<ProductForm>BC</ProductForm>'];
    const records = isbns.map((value, index) =>
      onixRecord({
        ref: value,
        identifiers: isbn(value),
        descriptive:
          forms[index] +
          MINIMAL_TITLE +
          editor +
          '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>',
        related: isbns
          .filter((other) => other !== value)
          .map(
            (other) => `<RelatedProduct><ProductRelationCode>06</ProductRelationCode>${isbn(other)}</RelatedProduct>`,
          )
          .join(''),
      }),
    );
    const { sidecar, descriptive } = await planFile(records);
    const model = buildImportReviewModel(sidecar, { descriptive });

    expect(model.works).toHaveLength(1);
    expect(model.totals).toMatchObject({ works: 1, publications: 2, worksNeedingAttention: 1, problems: 0 });
    const [work] = model.works;
    expect(work.state).toBe('NEEDS_CONFIRMATION');
    expect(work.publications.map(({ isbn: code, type }) => [code, type])).toEqual([
      [ISBN_A, 'HARDBACK'],
      [ISBN_B, 'PAPERBACK'],
    ]);

    // The contributor roles propose an edited book: a confirmation, never a fact, until the publisher confirms it.
    const workType = work.tasks.find(({ control }) => control.kind === 'WORK_TYPE');
    expect(workType).toMatchObject({
      state: 'PENDING',
      required: true,
      control: { kind: 'WORK_TYPE', suggestion: EditedBook, options: [Monograph, EditedBook, Textbook, JournalIssue] },
      input: { field: 'workTypeOverrides', key: work.groupKey },
    });
    expect(work.workType).toBeNull();
    expect(work.workTypeTaskKey).toBe(workType?.key);

    // The one biography-locale question of the grouped Work is one task, stated across both manifestations' locations,
    // proposing the Work's one text locale and naming the contributor it is about from canonical descriptive state.
    const locales = work.tasks.filter(({ control }) => control.kind === 'LOCALE');
    expect(locales).toHaveLength(1);
    expect(locales[0]).toMatchObject({
      state: 'PENDING',
      required: true,
      subject: 'Alex Example',
      control: { kind: 'LOCALE', suggestion: { value: 'EN', basis: 'WORK_TEXT_LOCALE', fromHeaderDefault: false } },
      input: { field: 'descriptiveChoices', key: locales[0].key },
    });
    expect(locales[0].evidence.locations).toHaveLength(2);
    expect(requiredPending(work.tasks)).toEqual([workType?.key, locales[0].key]);
    expect(model.totals.requiredConfirmations).toBe(2);
  });

  it('turns an answered WorkType and locale into resolved facts that are no longer pending, keeping their tasks for editing', async () => {
    const editor =
      '<Contributor><ContributorRole>B01</ContributorRole><PersonName>Alex Example</PersonName>' +
      '<NamesBeforeKey>Alex</NamesBeforeKey><KeyNames>Example</KeyNames><BiographicalNote textformat="06">Alex writes.</BiographicalNote></Contributor>';
    const records = [
      onixRecord({
        ref: 'pb',
        identifiers: isbn(ISBN_A),
        descriptive:
          '<ProductForm>BC</ProductForm>' +
          MINIMAL_TITLE +
          editor +
          '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>',
      }),
    ];
    const { sidecar: open, resolve } = await planFile(records);
    const [{ groupKey }] = open.workGroups;
    const locale = buildImportReviewModel(open).works[0].tasks.find(({ control }) => control.kind === 'LOCALE');
    const answered = resolve({
      workTypeOverrides: { [groupKey]: EditedBook },
      descriptiveChoices: { [locale?.key ?? '']: 'EN' },
    }).sidecar;
    const model = buildImportReviewModel(answered);
    const [work] = model.works;

    expect(work.state).toBe('READY');
    expect(work.workType).toBe(EditedBook);
    expect(work.tasks.find(({ control }) => control.kind === 'WORK_TYPE')).toMatchObject({
      state: 'RESOLVED',
      answer: EditedBook,
    });
    expect(work.tasks.find(({ control }) => control.kind === 'LOCALE')).toMatchObject({
      state: 'RESOLVED',
      answer: 'EN',
    });
    expect(requiredPending(work.tasks)).toEqual([]);
    expect(model.totals).toMatchObject({ requiredConfirmations: 0, worksNeedingAttention: 0 });
    expect(model.executable).toBe(true);
    expect(model.defaultFilter).toBe('ALL');
  });

  it('keeps a stale WorkType input as a rejected attention task, never as a resolved fact', async () => {
    const { sidecar } = await planFile(paperback, { workTypeOverrides: {} });
    const [{ groupKey }] = sidecar.workGroups;
    const stale: OnixImportPlanSidecar = {
      ...sidecar,
      inputs: { ...sidecar.inputs, workTypeOverrides: { [groupKey]: WorkTypes.enum.BookChapter } },
    };
    const [work] = buildImportReviewModel(stale).works;

    expect(work.workType).toBeNull();
    expect(work.tasks.find(({ control }) => control.kind === 'WORK_TYPE')).toMatchObject({
      state: 'REJECTED',
      answer: WorkTypes.enum.BookChapter,
    });
    expect(work.state).toBe('NEEDS_CONFIRMATION');
  });

  it('shows an automatic price as a Publication fact and no task, and a distinct-amount price as one compact task', async () => {
    const [{ groupKey }] = (await planFile(paperback)).sidecar.workGroups;
    const automatic = await planFile([supplied(gbp('20.00') + gbp('20', '<PriceQualifier>10</PriceQualifier>'))], {
      workTypeOverrides: { [groupKey]: Monograph },
    });
    const automaticModel = buildImportReviewModel(automatic.sidecar);
    const [automaticWork] = automaticModel.works;

    expect(automaticWork.publications[0].prices).toEqual([
      expect.objectContaining({ currencyCode: 'GBP', unitPrice: 20, basis: 'AUTOMATIC', taskKey: null }),
    ]);
    expect(automaticWork.tasks.filter(({ control }) => control.kind === 'PRICE')).toEqual([]);
    expect(automaticWork.state).toBe('READY');
    // What the file states beside the amount - a qualifier, supply detail Thoth does not record - is no task and no problem.
    expect(automaticWork.problems).toEqual([]);
    expect(automaticModel.automatic).toContainEqual({ kind: 'PRICES', count: 1 });

    const conflict = await planFile([supplied(gbp('20.00') + gbp('22.00'))], {
      workTypeOverrides: { [groupKey]: Monograph },
    });
    const [work] = buildImportReviewModel(conflict.sidecar).works;
    const prices = work.tasks.filter(({ control }) => control.kind === 'PRICE');

    expect(prices).toHaveLength(1);
    expect(prices[0]).toMatchObject({
      state: 'PENDING',
      required: true,
      scope: { kind: 'PRODUCT', productKey: work.publications[0].productKey },
      control: {
        kind: 'PRICE',
        currencyCode: 'GBP',
        candidates: [expect.objectContaining({ unitPrice: 20 }), expect.objectContaining({ unitPrice: 22 })],
        omitOffered: true,
      },
      input: { field: 'commercialChoices', key: prices[0].key },
    });
    expect(work.publications[0].prices).toEqual([]);
    expect(work.problems).toEqual([]);
    expect(work.state).toBe('NEEDS_CONFIRMATION');

    // Answered, the price is a Publication fact bound to its task; a stale answer is rejected and keeps the Work in attention.
    const chosen = conflict.resolve({
      workTypeOverrides: { [groupKey]: Monograph },
      commercialChoices: {
        [prices[0].key]: prices[0].control.kind === 'PRICE' ? prices[0].control.candidates[1].key : '',
      },
    }).sidecar;
    const [chosenWork] = buildImportReviewModel(chosen).works;
    expect(chosenWork.publications[0].prices).toEqual([
      expect.objectContaining({ unitPrice: 22, basis: 'PUBLISHER_CHOICE', taskKey: prices[0].key }),
    ]);
    expect(chosenWork.state).toBe('READY');

    const stale = conflict.resolve({
      workTypeOverrides: { [groupKey]: Monograph },
      commercialChoices: { [prices[0].key]: '/ONIXMessage[1]/Product[9]/Price[1]' },
    }).sidecar;
    const [staleWork] = buildImportReviewModel(stale).works;
    expect(staleWork.tasks.find(({ control }) => control.kind === 'PRICE')).toMatchObject({
      state: 'REJECTED',
      answer: '/ONIXMessage[1]/Product[9]/Price[1]',
    });
    expect(staleWork.state).toBe('NEEDS_CONFIRMATION');
    expect(staleWork.problems).toEqual([]);
  });

  it('keeps a genuine blocker nothing in the app answers as a problem, never as a task, and never both', async () => {
    const [{ groupKey }] = (await planFile(paperback)).sidecar.workGroups;
    const { sidecar } = await planFile([supplied(gbp('abc'))], { workTypeOverrides: { [groupKey]: Monograph } });
    const model = buildImportReviewModel(sidecar);
    const [work] = model.works;

    expect(work.state).toBe('BLOCKED');
    expect(work.problems.map(({ code }) => code)).toEqual(['COMMERCIAL_PREFLIGHT_GAP']);
    expect(work.problems[0].evidence).toMatchObject({ code: 'PRICE_AMOUNT_UNUSABLE' });
    expect(work.problems[0].evidence.locations.length).toBeGreaterThan(0);
    expect(work.tasks.map(({ key }) => key)).not.toContain(work.problems[0].evidence.findingKey);
    expect(model.totals).toMatchObject({ problems: 1, requiredConfirmations: 0, worksNeedingAttention: 1 });
    expect(model.defaultFilter).toBe('ALL');
  });

  it('keeps an invalid declared ORCID as a problem the file must correct', async () => {
    const [{ groupKey }] = (await planFile(paperback)).sidecar.workGroups;
    const invalidOrcid =
      '<ProductForm>BC</ProductForm><Contributor><ContributorRole>A01</ContributorRole><NameIdentifier><NameIDType>21</NameIDType><IDValue>not-an-orcid</IDValue></NameIdentifier>' +
      '<PersonName>Ada Lovelace</PersonName><NamesBeforeKey>Ada</NamesBeforeKey><KeyNames>Lovelace</KeyNames></Contributor>';
    const { sidecar } = await planFile(
      [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), descriptive: invalidOrcid })],
      {
        workTypeOverrides: { [groupKey]: Monograph },
      },
    );
    const [work] = buildImportReviewModel(sidecar).works;

    expect(work.problems.map(({ code, evidence }) => [code, evidence.code])).toEqual([
      ['DESCRIPTIVE_INPUT_REQUIRED', 'CONTRIBUTOR_ORCID_INVALID'],
    ]);
    expect(requiredPending(work.tasks)).toEqual([]);
    expect(work.state).toBe('BLOCKED');
  });

  it('shows one credited external front cover as a resolved fact, asking nothing and listing no loss', async () => {
    const [{ groupKey }] = (await planFile(paperback)).sidecar.workGroups;
    const collateral =
      '<CollateralDetail><SupportingResource><ResourceContentType>01</ResourceContentType><ContentAudience>00</ContentAudience>' +
      '<ResourceMode>03</ResourceMode><ResourceFeature><ResourceFeatureType>01</ResourceFeatureType><FeatureNote>Photo: A. Photographer</FeatureNote></ResourceFeature>' +
      '<ResourceVersion><ResourceForm>02</ResourceForm><ResourceLink>https://images.example.org/covers/a-work.jpg</ResourceLink></ResourceVersion>' +
      '</SupportingResource></CollateralDetail>';
    const { sidecar, descriptive } = await planFile(
      [onixRecord({ ref: 'pb', identifiers: isbn(ISBN_A), collateral })],
      { workTypeOverrides: { [groupKey]: Monograph } },
    );
    const model = buildImportReviewModel(sidecar, { descriptive });
    const [work] = model.works;

    expect(work.cover).toBe('FOUND');
    // The WorkType is already decided: nothing is pending, and nothing about the cover is asked.
    expect(pendingReviewTasks(work.tasks)).toEqual([]);
    expect(work.tasks.filter(({ family }) => family === 'DESCRIPTIVE')).toEqual([]);
    expect(work.problems).toEqual([]);
    expect(work.state).toBe('READY');
    expect(model.automatic).toContainEqual({ kind: 'COVERS', count: 1 });
    // Without the descriptive plan beside the sidecar nothing is said about the cover, and nothing else changes.
    const plain = buildImportReviewModel(sidecar);
    expect(plain.works[0].cover).toBeNull();
    expect(plain.works[0].state).toBe('READY');
  });

  it('takes display titles from the exact candidate or existing Work bound to the group, changing nothing else', async () => {
    const { sidecar } = await planFile(paperback);
    const [group] = sidecar.workGroups;
    const bare = buildImportReviewModel(sidecar);
    const candidatePlan: ImportPlan = {
      works: [
        getDefaultWork({
          id: 'candidate-1',
          titles: [getDefaultTitle({ title: 'Cities of Example', canonical: true })],
        }),
      ],
      chapters: [],
      series: [],
    };
    const bound: OnixImportPlanSidecar = {
      ...sidecar,
      workGroups: [{ ...group, plannedWorkId: 'candidate-1' }],
    };
    const titled = buildImportReviewModel(bound, { candidatePlan });

    expect(bare.works[0].title).toBeNull();
    expect(titled.works[0].title).toBe('Cities of Example');
    expect({ ...titled.works[0], title: null }).toEqual({ ...bare.works[0], title: null });
    expect(titled.totals).toEqual(bare.totals);

    const existing: OnixImportPlanSidecar = {
      ...sidecar,
      workGroups: [
        {
          ...group,
          target: 'EXISTING_WORK',
          existingWorkId: 'work-9',
          workType: { status: 'RESOLVED', type: Monograph, provenance: 'EXISTING_TARGET' },
        },
      ],
    };
    const targets: OnixTargetEvidence = {
      publisherId: 'publisher-1',
      identifiers: [],
      works: [
        {
          workId: 'work-9',
          type: Monograph,
          imprintId: 'imprint-1',
          edition: 1,
          doi: '',
          title: 'An Existing Work',
          license: '',
          publications: [],
          descriptive: {
            titles: [],
            languages: [],
            subjects: [],
            contributions: [],
            issues: [],
            status: 'ACTIVE',
            publicationDate: null,
            withdrawnDate: null,
            place: '',
            landingPage: '',
            copyrightHolder: '',
            pageCount: 0,
            imageCount: 0,
            tableCount: 0,
            audioCount: 0,
            videoCount: 0,
            bibliographyNote: '',
            fundings: [],
          },
        },
      ],
    };
    const existingModel = buildImportReviewModel(existing, { targets });
    expect(existingModel.works[0].title).toBe('An Existing Work');
    expect(existingModel.works[0].target).toBe('EXISTING_WORK');
    // An existing Work's type is never in question: no WorkType task is projected for it.
    expect(existingModel.works[0].tasks.filter(({ control }) => control.kind === 'WORK_TYPE')).toEqual([]);
  });

  it('answers tasks by writing exactly their canonical input, and clears them by removing it', async () => {
    const { sidecar } = await planFile(paperback);
    const [work] = buildImportReviewModel(sidecar).works;
    const workType = work.tasks.find(({ control }) => control.kind === 'WORK_TYPE') as OnixReviewTask;

    const chosen = answerReviewTask(sidecar.inputs, workType, Textbook);
    expect(chosen).toEqual({ ...EMPTY_ONIX_PLAN_INPUTS, workTypeOverrides: { [work.groupKey]: Textbook } });
    expect(answerReviewTask(chosen, workType, undefined)).toEqual(EMPTY_ONIX_PLAN_INPUTS);
    // Inputs are never mutated in place.
    expect(sidecar.inputs).toEqual(EMPTY_ONIX_PLAN_INPUTS);

    const edition: OnixReviewTask = {
      ...workType,
      key: 'edition',
      control: { kind: 'EDITION' },
      input: { field: 'editionInputs', key: work.groupKey },
    };
    expect(answerReviewTask(sidecar.inputs, edition, '2').editionInputs).toEqual({ [work.groupKey]: 2 });

    const record: OnixReviewTask = {
      ...workType,
      key: 'record',
      control: { kind: 'CONFIRM' },
      input: { field: 'excludedRecordKeys', key: 'record-b' },
    };
    const excluded = answerReviewTask({ ...sidecar.inputs, excludedRecordKeys: ['record-c'] }, record, 'true');
    expect(excluded.excludedRecordKeys).toEqual(['record-b', 'record-c']);
    expect(answerReviewTask(excluded, record, undefined).excludedRecordKeys).toEqual(['record-c']);

    const compatibility: OnixReviewTask = {
      ...workType,
      key: 'compatibility',
      control: { kind: 'CONFIRM' },
      input: { field: 'thothCompatibilityConfirmed' },
    };
    expect(answerReviewTask(sidecar.inputs, compatibility, 'true').thothCompatibilityConfirmed).toBe(true);
    expect(answerReviewTask(sidecar.inputs, compatibility, undefined).thothCompatibilityConfirmed).toBe(false);
  });

  it('projects a file-level record exclusion as a file task, and a Work-less blocker as a file problem', async () => {
    const partial =
      `<Product><RecordReference>upd</RecordReference><NotificationType>04</NotificationType>${isbn(ISBN_B)}` +
      `<DescriptiveDetail><ProductForm>BC</ProductForm>${MINIMAL_TITLE}</DescriptiveDetail></Product>`;
    const { sidecar, resolve } = await planFile([...paperback, partial]);
    const model = buildImportReviewModel(sidecar);
    const exclusion = model.fileTasks.find(({ control }) => control.kind === 'CONFIRM');

    expect(exclusion).toMatchObject({
      state: 'PENDING',
      required: true,
      scope: { kind: 'RECORD', label: 'upd' },
      input: { field: 'excludedRecordKeys' },
    });
    expect(model.fileProblems).toEqual([]);
    expect(model.totals.requiredConfirmations).toBeGreaterThanOrEqual(1);

    const excluded = buildImportReviewModel(
      resolve({ excludedRecordKeys: exclusion?.input.field === 'excludedRecordKeys' ? [exclusion.input.key] : [] })
        .sidecar,
    );
    expect(excluded.fileTasks.find(({ control }) => control.kind === 'CONFIRM')).toMatchObject({ state: 'RESOLVED' });
  });

  /** A complete paperback and a non-complete record addressing the same Product: the sequence the file leaves ambiguous. */
  const updateOf = (ref: string, identifiers: string) =>
    `<Product><RecordReference>${ref}</RecordReference><NotificationType>04</NotificationType>${identifiers}` +
    `<DescriptiveDetail><ProductForm>BC</ProductForm>${MINIMAL_TITLE}</DescriptiveDetail></Product>`;
  const recordTaskOf = (model: ReturnType<typeof buildImportReviewModel>, label: string) =>
    model.fileTasks.find(({ scope }) => scope.kind === 'RECORD' && scope.label === label);

  it('represents a resolvable sequence ambiguity by its record-exclusion tasks alone, never also as a problem, until the exclusions resolve it canonically (#264 CR-3)', async () => {
    const { sidecar, resolve } = await planFile([...paperback, updateOf('upd', isbn(ISBN_A))]);
    const ambiguity = sidecar.blockers.find(({ code }) => code === 'RECORD_SEQUENCE_AMBIGUITY');
    const incomplete = sidecar.blockers.find(({ code }) => code === 'RECORD_NOT_COMPLETE');

    // The canonical contract: the ambiguity names no record of its own, but every record whose exclusion resolves it.
    expect(incomplete).toBeDefined();
    expect(ambiguity).toMatchObject({ recordKey: null, productKey: sidecar.products[0].productKey });
    expect(ambiguity?.detail.recordKeys).toEqual([incomplete?.recordKey]);
    expect(sidecar.executable).toBe(false);

    const model = buildImportReviewModel(sidecar);
    const exclusion = recordTaskOf(model, 'upd');

    expect(model.fileTasks.filter(({ scope }) => scope.kind === 'RECORD')).toHaveLength(1);
    expect(exclusion).toMatchObject({ state: 'PENDING', required: true, input: { field: 'excludedRecordKeys' } });
    // The one action the publisher has is the exclusion; the same condition is not also a problem of the Work or file.
    expect(model.works[0].problems).toEqual([]);
    expect(model.fileProblems).toEqual([]);
    expect(model.totals.problems).toBe(0);
    expect(model.works[0].state).not.toBe('BLOCKED');

    // Excluded through the canonical input, the sequence blocker is gone canonically, and nothing new appears.
    const recordKey = exclusion?.input.key as string;
    const excluded = resolve({ excludedRecordKeys: [recordKey] }).sidecar;
    expect(excluded.blockers.map(({ code }) => code)).not.toContain('RECORD_SEQUENCE_AMBIGUITY');
    expect(excluded.blockers.map(({ code }) => code)).not.toContain('RECORD_NOT_COMPLETE');
    const after = buildImportReviewModel(excluded);
    expect(recordTaskOf(after, 'upd')).toMatchObject({ state: 'RESOLVED' });
    expect(after.totals.problems).toBe(0);
    // What remains is the Work's own requirement, and once it is given the file is executable.
    expect(requiredPending(after.works[0].tasks)).toEqual([`work-type|${excluded.workGroups[0].groupKey}`]);
    expect(
      resolve({ excludedRecordKeys: [recordKey], workTypeOverrides: { [excluded.workGroups[0].groupKey]: Monograph } })
        .sidecar.executable,
    ).toBe(true);
  });

  it('keeps a sequence ambiguity a problem whenever its record keys are missing, empty, malformed, or name a record no task excludes (#264 CR-3)', async () => {
    const { sidecar } = await planFile([...paperback, updateOf('upd', isbn(ISBN_A))]);
    const ambiguity = sidecar.blockers.find(({ code }) => code === 'RECORD_SEQUENCE_AMBIGUITY') as OnixPlanBlocker;
    const others = sidecar.blockers.filter(({ code }) => code !== 'RECORD_SEQUENCE_AMBIGUITY');
    const withDetail = (detail: OnixPlanBlocker['detail']) =>
      buildImportReviewModel({ ...sidecar, blockers: [...others, { ...ambiguity, detail }] });

    expect(buildImportReviewModel(sidecar).totals.problems).toBe(0);
    for (const detail of [
      {},
      { recordKeys: [] },
      { recordKeys: 'upd' as unknown as readonly string[] },
      { recordKeys: [42] as unknown as readonly string[] },
      { recordKeys: [ambiguity.detail.recordKeys as string, 'ghost'] as unknown as readonly string[] },
      { recordKeys: ['ghost'] },
    ]) {
      const model = withDetail(detail);

      expect(model.totals.problems).toBe(1);
      expect([...model.works[0].problems, ...model.fileProblems].map(({ code }) => code)).toEqual([
        'RECORD_SEQUENCE_AMBIGUITY',
      ]);
      // The exclusion task itself is unchanged by how the ambiguity is described.
      expect(recordTaskOf(model, 'upd')).toMatchObject({ state: 'PENDING', required: true });
    }
  });

  it('counts Work-owned and file-level confirmations apart, and the Works that carry one apart from the Works needing attention (#264 CR-4)', async () => {
    const revised = onixRecord({
      ref: 'pb',
      identifiers: isbn(ISBN_A),
      descriptive: '<ProductForm>BC</ProductForm><EditionType>REV</EditionType>',
    });
    const withFileTask = [revised, updateOf('upd', isbn(ISBN_B))];
    const [{ groupKey }] = (await planFile(withFileTask)).sidecar.workGroups;

    // Mixed: the WorkType and the edition are the Work's, the exclusion is the file's.
    const mixed = buildImportReviewModel((await planFile(withFileTask)).sidecar);
    expect(mixed.totals).toMatchObject({
      requiredConfirmations: 3,
      workRequiredConfirmations: 2,
      fileRequiredConfirmations: 1,
      worksWithRequiredConfirmations: 1,
      worksNeedingAttention: 1,
      problems: 0,
    });

    // File only: the Work is decided; the exclusion still waits, and it belongs to no Work.
    const fileOnly = buildImportReviewModel(
      (await planFile(withFileTask, { workTypeOverrides: { [groupKey]: Monograph }, editionInputs: { [groupKey]: 2 } }))
        .sidecar,
    );
    expect(fileOnly.totals).toMatchObject({
      requiredConfirmations: 1,
      workRequiredConfirmations: 0,
      fileRequiredConfirmations: 1,
      worksWithRequiredConfirmations: 0,
      worksNeedingAttention: 0,
    });

    // Work only, over two Works: each carries its own WorkType confirmation.
    const twoWorks = buildImportReviewModel(
      (await planFile([...paperback, onixRecord({ ref: 'hb', identifiers: isbn(ISBN_B) })])).sidecar,
    );
    expect(twoWorks.totals).toMatchObject({
      requiredConfirmations: 2,
      workRequiredConfirmations: 2,
      fileRequiredConfirmations: 0,
      worksWithRequiredConfirmations: 2,
      worksNeedingAttention: 2,
    });

    // Blocked without any confirmation: attention, yes; a Work carrying a confirmation, no.
    const blocked = buildImportReviewModel(
      (await planFile([supplied(gbp('abc'))], { workTypeOverrides: { [groupKey]: Monograph } })).sidecar,
    );
    expect(blocked.works[0].state).toBe('BLOCKED');
    expect(blocked.totals).toMatchObject({
      requiredConfirmations: 0,
      workRequiredConfirmations: 0,
      fileRequiredConfirmations: 0,
      worksWithRequiredConfirmations: 0,
      worksNeedingAttention: 1,
      problems: 1,
    });
  });

  it('shows the Thoth compatibility confirmation as a file task while it is awaited, and resolved once confirmed', async () => {
    const { sidecar } = await planFile(paperback);
    const awaiting: OnixImportPlanSidecar = {
      ...sidecar,
      compatibility: { ...sidecar.compatibility, activation: 'AWAITING_CONFIRMATION' },
      blockers: [
        ...sidecar.blockers,
        {
          code: 'THOTH_COMPATIBILITY_CONFIRMATION_REQUIRED',
          classification: 'TARGET_INPUT_REQUIRED',
          recordKey: null,
          productKey: null,
          groupKey: null,
          paths: [],
          detail: {},
        },
      ],
    };
    const model = buildImportReviewModel(awaiting);
    const task = model.fileTasks.find(({ input }) => input.field === 'thothCompatibilityConfirmed');

    expect(task).toMatchObject({ state: 'PENDING', required: true, control: { kind: 'CONFIRM' } });
    expect(model.fileProblems).toEqual([]);

    const confirmed = buildImportReviewModel({
      ...awaiting,
      compatibility: { ...sidecar.compatibility, activation: 'CONFIRMED' },
      inputs: { ...sidecar.inputs, thothCompatibilityConfirmed: true },
      blockers: sidecar.blockers,
    });
    expect(confirmed.fileTasks.find(({ input }) => input.field === 'thothCompatibilityConfirmed')).toMatchObject({
      state: 'RESOLVED',
      answer: 'true',
    });
  });

  it('offers to clear a stale answer to a finding the file does not have, owned by the file when it names no Work', async () => {
    const [{ groupKey }] = (await planFile(paperback)).sidecar.workGroups;
    const { sidecar } = await planFile(paperback, { workTypeOverrides: { [groupKey]: Monograph } });
    const stale: OnixImportPlanSidecar = {
      ...sidecar,
      inputs: { ...sidecar.inputs, rightsChoices: { 'RIGHTS|gone': 'ACKNOWLEDGED' } },
      executable: false,
      blockers: [
        {
          code: 'RIGHTS_CHOICE_STALE',
          classification: 'TARGET_INPUT_REQUIRED',
          recordKey: null,
          productKey: null,
          groupKey: null,
          paths: [],
          detail: { findingKey: 'RIGHTS|gone' },
        },
      ],
    };
    const model = buildImportReviewModel(stale);

    expect(model.fileTasks).toEqual([
      expect.objectContaining({
        state: 'REJECTED',
        required: true,
        control: { kind: 'CLEAR' },
        input: { field: 'rightsChoices', key: 'RIGHTS|gone' },
      }),
    ]);
    expect(model.fileProblems).toEqual([]);
    expect(model.totals.requiredConfirmations).toBe(1);
    expect(answerReviewTask(stale.inputs, model.fileTasks[0], undefined).rightsChoices).toEqual({});
  });

  it('counts a file of hundreds of ready Works and a few needing attention exactly, opening on attention', async () => {
    const { sidecar: ready } = await planFile(paperback, {});
    const [group] = ready.workGroups;
    const [product] = ready.products;
    const [record] = ready.records;
    const clone = (index: number, resolved: boolean) => {
      const groupKey = `group-${index}`;
      const productKey = `product-${index}`;
      const recordKey = `record-${index}`;

      return {
        group: {
          ...group,
          groupKey,
          productKeys: [productKey],
          workType: resolved
            ? { status: 'RESOLVED' as const, type: Monograph, provenance: 'USER_WORK_OVERRIDE' as const }
            : group.workType,
          executable: resolved,
        },
        product: {
          ...product,
          productKey,
          groupKey,
          recordKeys: [recordKey],
          isbn: `978180000${String(index).padStart(4, '0')}`,
        },
        record: { ...record, recordKey, index, recordReference: `rec-${index}`, productKey },
        override: resolved ? [[groupKey, Monograph] as const] : [],
        blocker: resolved
          ? []
          : [
              {
                code: 'WORK_TYPE_INPUT_REQUIRED' as const,
                classification: 'TARGET_INPUT_REQUIRED' as const,
                recordKey: null,
                productKey: null,
                groupKey,
                paths: [],
                detail: {},
              },
            ],
      };
    };
    const clones = Array.from({ length: 303 }, (_, index) => clone(index + 1, index >= 3));
    const many: OnixImportPlanSidecar = {
      ...ready,
      executable: false,
      records: clones.map(({ record }) => record),
      products: clones.map(({ product }) => product),
      workGroups: clones.map(({ group: cloned }) => cloned),
      inputs: { ...ready.inputs, workTypeOverrides: Object.fromEntries(clones.flatMap(({ override }) => override)) },
      blockers: clones.flatMap(({ blocker }) => blocker),
      findings: [],
      descriptive: { ...ready.descriptive, findings: [] },
    };
    const started = performance.now();
    const model = buildImportReviewModel(many);
    const elapsed = performance.now() - started;

    expect(model.totals).toEqual({
      works: 303,
      publications: 303,
      requiredConfirmations: 3,
      workRequiredConfirmations: 3,
      fileRequiredConfirmations: 0,
      worksWithRequiredConfirmations: 3,
      worksNeedingAttention: 3,
      problems: 0,
    });
    expect(model.defaultFilter).toBe('ATTENTION');
    expect(filterReviewWorks(model.works, 'ATTENTION').map(({ groupKey }) => groupKey)).toEqual([
      'group-1',
      'group-2',
      'group-3',
    ]);
    expect(filterReviewWorks(model.works, 'READY')).toHaveLength(300);
    expect(filterReviewWorks(model.works, 'ALL')).toHaveLength(303);
    // A projection of three hundred Works is cheap enough to run on every decision.
    expect(elapsed).toBeLessThan(1_000);
  });

  it('reads canonical state only: the sidecar it is given is never changed', async () => {
    const { sidecar, descriptive } = await planFile(paperback);
    const before = JSON.stringify(sidecar);
    const descriptiveBefore = JSON.stringify(descriptive);

    buildImportReviewModel(sidecar, { descriptive });

    expect(JSON.stringify(sidecar)).toBe(before);
    expect(JSON.stringify(descriptive)).toBe(descriptiveBefore);
  });

  describe('the University of London Press shape', () => {
    const INSTITUTE = 'Institute of Example Studies, University of Example (United Kingdom)';
    const FUNDER = 'Example Council of Learned Societies (ECLS)';
    const ISBNS = ['9781800000018', '9781800000025', '9781800000032'];
    const FORMS = [
      '<ProductForm>BB</ProductForm>',
      '<ProductForm>BC</ProductForm>',
      '<ProductForm>EA</ProductForm><ProductFormDetail>E101</ProductFormDetail>',
    ];
    const editor = (sequence: string, first: string, last: string, biography: string) =>
      `<Contributor><SequenceNumber>${sequence}</SequenceNumber><ContributorRole>B01</ContributorRole>` +
      `<PersonName>${first} ${last}</PersonName><NamesBeforeKey>${first}</NamesBeforeKey><KeyNames>${last}</KeyNames>` +
      `<ProfessionalAffiliation><ProfessionalPosition>Professor</ProfessionalPosition><Affiliation>${INSTITUTE}</Affiliation></ProfessionalAffiliation>` +
      `<BiographicalNote textformat="06">${biography}</BiographicalNote></Contributor>`;
    const records = ISBNS.map((value, index) =>
      onixRecord({
        ref: value,
        identifiers: isbn(value),
        descriptive:
          FORMS[index] +
          '<Collection><CollectionType>10</CollectionType><TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>02</TitleElementLevel><TitleText>Studies in Example Cultures</TitleText></TitleElement></TitleDetail></Collection>' +
          MINIMAL_TITLE +
          editor('1', 'Alex', 'Example', 'Alex Example writes on literature.') +
          editor('2', 'Sam', 'Sample', 'Sam Sample writes on translation.') +
          '<Language><LanguageRole>01</LanguageRole><LanguageCode>eng</LanguageCode></Language>',
        publishing:
          `<Publisher><PublishingRole>14</PublishingRole><PublisherName>${FUNDER}</PublisherName></Publisher>` +
          '<PublishingStatus>02</PublishingStatus>',
        related: ISBNS.filter((other) => other !== value)
          .map(
            (other) => `<RelatedProduct><ProductRelationCode>06</ProductRelationCode>${isbn(other)}</RelatedProduct>`,
          )
          .join(''),
      }),
    );
    const INSTITUTIONS: Record<string, { id: string; name: string; ror: string }[]> = {
      'Institute of Example Studies': [{ id: 'institution-institute', name: 'Institute of Example Studies', ror: '' }],
      'University of Example': [{ id: 'institution-university', name: 'University of Example', ror: '' }],
      'Example Council of Learned Societies': [
        { id: 'institution-council', name: 'Example Council of Learned Societies', ror: '' },
      ],
    };

    /** The plan XMLParse holds for the file, adapted by the real adapter against Thoth's institution search. */
    const planningFor = async () => {
      const message = parse(
        `<ONIXMessage release="3.0" xmlns="${REFERENCE_NS}">${GENERIC_HEADER}${records.join('')}</ONIXMessage>`,
      ) as ExtendedONIXMessageRoot;
      const sourcePlan = planOnixSource(message);
      const descriptive: OnixDescriptivePlan = reduceOnixDescriptive(message, sourcePlan);
      const targets = await resolveOnixTargets(sourcePlan, noMatches, 'publisher-1');
      const parsed = await new XMLParser(
        message,
        IMPRINTS,
        licenseOptions,
        [],
        { getContributors: async () => [], getContributorsByOrcids: async () => [] } as never,
        {
          getInstitutions: async (_offset: number, _limit: number, filter: string) =>
            (INSTITUTIONS[filter] ?? []).map((institution) => ({
              ...institution,
              doi: '',
              countryCode: '',
              updatedAt: '',
            })),
        } as never,
        languageOptions,
        currencyOptions,
        { sourcePlan, descriptive, adaptGroupKeys: adaptableGroupKeys(sourcePlan, targets, IMPRINTS) },
      ).parse();
      const resolve = (inputs: Partial<OnixPlanInputs>) =>
        resolveOnixImportPlan({
          sourcePlan,
          targets,
          inputs: { ...EMPTY_ONIX_PLAN_INPUTS, ...inputs },
          imprints: IMPRINTS,
          descriptive,
          serieses: [],
          candidatePlan: parsed.data.plan,
          adaptation: parsed.data.onix?.groups,
        });

      return { resolve, descriptive, candidatePlan: parsed.data.plan };
    };

    it('reads as one Work decided once, every decision inside it, each asked once for all manifestations', async () => {
      const { resolve, descriptive, candidatePlan } = await planningFor();
      const { sidecar } = resolve({});
      const model = buildImportReviewModel(sidecar, { descriptive, candidatePlan });

      expect(model.works).toHaveLength(1);
      const [work] = model.works;
      expect(work.title).toBe('A Work');
      expect(work.publications).toHaveLength(3);
      expect(work.publications.every(({ action }) => action === 'CREATE_PUBLICATION')).toBe(true);
      // Nothing is offered for omission: the file resolves every Publication.
      expect(work.tasks.filter(({ control }) => control.kind === 'MANIFESTATION')).toEqual([]);
      // One WorkType proposal, two biography locales with the English proposal, two affiliations, one funder, one Series.
      const kinds = pendingReviewTasks(work.tasks).map(({ control }) => control.kind);
      expect(kinds.filter((kind) => kind === 'WORK_TYPE')).toHaveLength(1);
      expect(kinds.filter((kind) => kind === 'LOCALE')).toHaveLength(2);
      expect(kinds.filter((kind) => kind === 'INSTITUTION')).toHaveLength(3);
      expect(kinds.filter((kind) => kind === 'ACKNOWLEDGE')).toHaveLength(1);
      expect(kinds).toHaveLength(7);
      expect(work.requiredConfirmations).toBe(7);
      // Each descriptive decision is asked once for the Work, and still names every manifestation's source location.
      work.tasks
        .filter(({ family }) => family === 'DESCRIPTIVE')
        .forEach((task) => expect(task.evidence.locations).toHaveLength(3));
      const locales = work.tasks.filter(({ control }) => control.kind === 'LOCALE');
      expect(locales.map(({ subject }) => subject)).toEqual(['Alex Example', 'Sam Sample']);
      locales.forEach(({ control }) => expect(control).toMatchObject({ suggestion: { value: 'EN' } }));
      const institutions = work.tasks.filter(({ control }) => control.kind === 'INSTITUTION');
      expect(institutions.map(({ subject }) => subject)).toEqual([INSTITUTE, INSTITUTE, FUNDER]);
      expect(
        institutions.map(({ control }) =>
          control.kind === 'INSTITUTION' ? control.options.map(({ key }) => key) : [],
        ),
      ).toEqual([
        ['institution-institute', 'institution-university'],
        ['institution-institute', 'institution-university'],
        ['institution-council'],
      ]);
      // No TOC, no RelatedProduct loss, no "not imported" list: nothing deterministic reaches the publisher.
      expect(work.problems).toEqual([]);
      expect(model.fileTasks).toEqual([]);
      expect(model.fileProblems).toEqual([]);
      expect(model.totals).toMatchObject({ requiredConfirmations: 7, worksNeedingAttention: 1, problems: 0 });
      expect(model.automatic).toContainEqual({ kind: 'GROUPED', count: 1 });
      expect(model.automatic).toContainEqual({ kind: 'FORMATS', count: 3 });
    });
  });
});
