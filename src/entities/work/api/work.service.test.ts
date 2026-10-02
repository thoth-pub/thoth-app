import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarkupFormat } from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { appConfig } from '@/src/shared/config';
import {
  AwardRoles,
  ContributorTypes,
  CurrencyCode,
  LocationPlatforms,
  PublicationType,
  SubjectTypes,
} from '@/src/shared/constants';
import { getDefaultContribution } from '@/src/shared/constants/contributions';
import { SeriesType as SeriesTypes } from '@/src/shared/constants/series';
import type {
  ImportExecutionAction,
  ImportExecutionProgress,
  ImportExecutionUnit,
  ImportPlan,
  ImportRelationEdge,
  ImportWorkRef,
  ProposedSeries,
  SeriesImportPlan,
} from '@/src/shared/types';
import { getDefaultFunding } from '@/src/shared/utils/fundings';
import { getDefaultPublication } from '@/src/shared/utils/publications';
import { getDefaultAbstract, getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

import { AbstractService } from '../../abstract/api/abstract.service';
import { AffiliationService } from '../../affiliation/api/affiliation.service';
import { ContributionService } from '../../contribution/api/contribution.service';
import type { WorkContribution } from '../../contribution/model/contribution.types';
import { ContributorService } from '../../contributor/api/contributor.service';
import { FundingService } from '../../funding/api/funding.service';
import { LanguageService } from '../../language/api/language.service';
import { PublicationService } from '../../publication/api/publication.service';
import { ReferenceService } from '../../reference/api/reference.service';
import { SeriesService } from '../../series';
import { SubjectService } from '../../subject/api/subject.service';
import { TitleService } from '../../title/api/title.service';
import { ImportExecutionError } from '../model/import-execution.error';
import { WorkDtoMapper } from '../model/work.mapper';
import type { WorkDto, WorkEntity } from '../model/work.types';
import { WorkService } from './work.service';

describe('createWork', () => {
  let workService: WorkService;
  let mockGraphqlService: GraphqlService;
  let mockTitleService: TitleService;
  let mockAbstractService: AbstractService;
  let mockSubjectService: SubjectService;
  let mockFundingService: FundingService;
  let mockContributionService: ContributionService;
  let mockPublicationService: PublicationService;
  let mockLanguageService: LanguageService;
  let mockSeriesService: SeriesService;
  let mockReferenceService: ReferenceService;
  let mockMapper: WorkDtoMapper;

  const mockWorkDto = (id: string, entity: WorkEntity): WorkDto =>
    ({
      workId: id,
      workType: entity.type,
      workStatus: entity.status,
      titles: [],
      updatedAt: '',
      imprintId: entity.imprintId,
      edition: entity.edition,
    }) as unknown as WorkDto;

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockTitleService = {
      createTitle: vi.fn(),
      createTitles: vi.fn(),
      deleteTitle: vi.fn(),
    } as unknown as TitleService;

    mockAbstractService = {
      createAbstract: vi.fn(),
      deleteAbstract: vi.fn(),
    } as unknown as AbstractService;

    mockSubjectService = {
      createSubject: vi.fn(),
      deleteSubject: vi.fn(),
    } as unknown as SubjectService;

    mockFundingService = {
      createFunding: vi.fn(),
      deleteFunding: vi.fn(),
    } as unknown as FundingService;

    mockContributionService = {
      createContribution: vi.fn(),
      deleteContribution: vi.fn(),
    } as unknown as ContributionService;

    mockPublicationService = {
      createPublication: vi.fn(),
      deletePublication: vi.fn(),
    } as unknown as PublicationService;

    mockLanguageService = {
      createLanguage: vi.fn(),
    } as unknown as LanguageService;

    mockSeriesService = {} as unknown as SeriesService;

    mockReferenceService = {
      createReference: vi.fn(),
      deleteReference: vi.fn(),
    } as unknown as ReferenceService;

    mockMapper = new WorkDtoMapper();

    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: WorkEntity) => {
      return { workId: entity.id } as unknown as WorkDto;
    });

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: WorkDto) => {
      return getDefaultWork({ id: dto.workId });
    });

    workService = new WorkService({
      graphqlService: mockGraphqlService,
      fundingService: mockFundingService,
      subjectService: mockSubjectService,
      contributionService: mockContributionService,
      publicationService: mockPublicationService,
      languageService: mockLanguageService,
      seriesService: mockSeriesService,
      referenceService: mockReferenceService,
      titleService: mockTitleService,
      abstractService: mockAbstractService,
      mapper: mockMapper,
    });
  });

  it('should create a work with titles and abstracts successfully', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'Test' });
    const abstract = getDefaultAbstract({ id: faker.string.uuid(), content: 'Abstract' });
    const workEntity = getDefaultWork({
      id: faker.string.uuid(),
      titles: [title],
      abstracts: [abstract],
    });
    const createdId = faker.string.uuid();
    const createdTitleId = faker.string.uuid();
    const createdAbstractId = faker.string.uuid();

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
      createWork: mockWorkDto(createdId, workEntity),
    });

    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockResolvedValue([{ ...title, id: createdTitleId }]);

    (mockAbstractService.createAbstract as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...abstract,
      id: createdAbstractId,
    });

    const result = await workService.createWork(workEntity);

    expect(result.id).toBe(createdId);
    expect(result.titles).toHaveLength(1);
    expect(result.abstracts).toHaveLength(1);
  });

  it('should rollback (delete work) exactly once when title creation fails', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'Failing' });
    const workEntity = getDefaultWork({ id: faker.string.uuid(), titles: [title] });
    const createdId = faker.string.uuid();
    const errorMessage = 'Title creation failed';

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
      createWork: mockWorkDto(createdId, workEntity),
    });

    // TitleService.createTitles rolls the attempt back itself, the work included, before it rejects.
    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockImplementation(
      async (_titles: unknown, _workId: unknown, transactions: { rollback: () => Promise<void> }) => {
        await transactions.rollback();
        throw new Error(errorMessage);
      },
    );

    const promise = workService.createWork(workEntity);

    await expect(promise).rejects.toThrow(errorMessage);
    expect(mockGraphqlService.mutation).toHaveBeenCalledTimes(2);
    expect(mockGraphqlService.mutation).toHaveBeenLastCalledWith(expect.anything(), { workId: createdId });
  });

  it('should rollback work when abstract creation fails', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'Title' });
    const abstract = getDefaultAbstract({ id: faker.string.uuid(), content: 'Abstract' });
    const workEntity = getDefaultWork({
      id: faker.string.uuid(),
      titles: [title],
      abstracts: [abstract],
    });
    const createdId = faker.string.uuid();
    const createdTitleId = faker.string.uuid();
    const errorMessage = 'Abstract creation failed';

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
      createWork: mockWorkDto(createdId, workEntity),
    });

    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockResolvedValue([{ ...title, id: createdTitleId }]);

    (mockAbstractService.createAbstract as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

    const promise = workService.createWork(workEntity);

    await expect(promise).rejects.toThrow(errorMessage);
    expect(mockTitleService.deleteTitle).not.toHaveBeenCalled();
    expect(mockGraphqlService.mutation).toHaveBeenLastCalledWith(expect.anything(), { workId: createdId });
  });

  it('should rollback all created entities when subject creation fails', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'Title' });
    const abstract = getDefaultAbstract({ id: faker.string.uuid(), content: 'Abs' });
    const subject = { id: faker.string.uuid(), type: SubjectTypes.enum.Keyword, code: '', ordinal: 1 };
    const workEntity = getDefaultWork({
      id: faker.string.uuid(),
      titles: [title],
      abstracts: [abstract],
      subjects: [subject],
    });
    const createdId = faker.string.uuid();
    const createdTitleId = faker.string.uuid();
    const createdAbstractId = faker.string.uuid();
    const errorMessage = 'Subject creation failed';

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
      createWork: mockWorkDto(createdId, workEntity),
    });

    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockResolvedValue([{ ...title, id: createdTitleId }]);

    (mockAbstractService.createAbstract as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...abstract,
      id: createdAbstractId,
    });
    (mockAbstractService.deleteAbstract as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    (mockSubjectService.createSubject as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

    const promise = workService.createWork(workEntity);

    await expect(promise).rejects.toThrow(errorMessage);
    expect(mockAbstractService.deleteAbstract).toHaveBeenCalledWith(createdAbstractId);
    expect(mockTitleService.deleteTitle).not.toHaveBeenCalled();
    expect(mockGraphqlService.mutation).toHaveBeenLastCalledWith(expect.anything(), { workId: createdId });
  });

  it('should rollback all entities when funding creation fails', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'T' });
    const funding = getDefaultFunding({ id: faker.string.uuid() });
    const workEntity = getDefaultWork({
      id: faker.string.uuid(),
      titles: [title],
      fundings: [funding],
    });
    const createdId = faker.string.uuid();
    const createdTitleId = faker.string.uuid();
    const errorMessage = 'Funding creation failed';

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
      createWork: mockWorkDto(createdId, workEntity),
    });

    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockResolvedValue([{ ...title, id: createdTitleId }]);

    (mockFundingService.createFunding as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

    const promise = workService.createWork(workEntity);

    await expect(promise).rejects.toThrow(errorMessage);
    expect(mockTitleService.deleteTitle).not.toHaveBeenCalled();
    expect(mockGraphqlService.mutation).toHaveBeenLastCalledWith(expect.anything(), { workId: createdId });
  });

  it('should rollback all entities when contribution creation fails', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'T' });
    const contribution = getDefaultContribution({ id: faker.string.uuid() });
    const workEntity = getDefaultWork({
      id: faker.string.uuid(),
      titles: [title],
      contributions: [contribution],
    });
    const createdId = faker.string.uuid();
    const createdTitleId = faker.string.uuid();
    const errorMessage = 'Contribution creation failed';

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
      createWork: mockWorkDto(createdId, workEntity),
    });

    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockResolvedValue([{ ...title, id: createdTitleId }]);

    (mockContributionService.createContribution as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

    const promise = workService.createWork(workEntity);

    await expect(promise).rejects.toThrow(errorMessage);
    expect(mockTitleService.deleteTitle).not.toHaveBeenCalled();
    expect(mockGraphqlService.mutation).toHaveBeenLastCalledWith(expect.anything(), { workId: createdId });
  });

  it('should rollback all entities when publication creation fails', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'T' });
    const publication = getDefaultPublication({ id: faker.string.uuid() });
    const workEntity = getDefaultWork({
      id: faker.string.uuid(),
      titles: [title],
      publications: [publication],
    });
    const createdId = faker.string.uuid();
    const createdTitleId = faker.string.uuid();
    const errorMessage = 'Publication creation failed';

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
      createWork: mockWorkDto(createdId, workEntity),
    });

    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockResolvedValue([{ ...title, id: createdTitleId }]);

    (mockPublicationService.createPublication as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

    const promise = workService.createWork(workEntity);

    await expect(promise).rejects.toThrow(errorMessage);
    expect(mockTitleService.deleteTitle).not.toHaveBeenCalled();
    expect(mockGraphqlService.mutation).toHaveBeenLastCalledWith(expect.anything(), { workId: createdId });
  });

  it('should rollback all entities when reference creation fails', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'T' });
    const reference = {
      id: faker.string.uuid(),
      unstructuredCitation: 'Ref 1',
      doi: faker.string.uuid(),
      journalTitle: faker.string.uuid(),
      articleTitle: faker.string.uuid(),
      seriesTitle: faker.string.uuid(),
      volumeTitle: faker.string.uuid(),
      url: faker.string.uuid(),
      orderNumber: 1,
    };
    const workEntity = getDefaultWork({
      id: faker.string.uuid(),
      titles: [title],
      references: [reference],
    });
    const createdId = faker.string.uuid();
    const createdTitleId = faker.string.uuid();
    const errorMessage = 'Reference creation failed';

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
      createWork: mockWorkDto(createdId, workEntity),
    });

    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockResolvedValue([{ ...title, id: createdTitleId }]);

    (mockReferenceService.createReference as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

    const promise = workService.createWork(workEntity);

    await expect(promise).rejects.toThrow(errorMessage);
    expect(mockTitleService.deleteTitle).not.toHaveBeenCalled();
    expect(mockGraphqlService.mutation).toHaveBeenLastCalledWith(expect.anything(), { workId: createdId });
  });

  it('should still throw original error even if rollback fails', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'T' });
    const workEntity = getDefaultWork({ id: faker.string.uuid(), titles: [title] });
    const createdId = faker.string.uuid();
    const titleErrorMessage = 'Title creation failed';

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        createWork: mockWorkDto(createdId, workEntity),
      })
      .mockRejectedValueOnce(new Error('Delete work failed'));

    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockImplementation(
      async (_titles: unknown, _workId: unknown, transactions: { rollback: () => Promise<void> }) => {
        await transactions.rollback();
        throw new Error(titleErrorMessage);
      },
    );

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const promise = workService.createWork(workEntity);

    await expect(promise).rejects.toThrow(titleErrorMessage);
    expect(mockGraphqlService.mutation).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });

  it('should rollback in reverse order (last registered first)', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'T' });
    const abstract = getDefaultAbstract({ id: faker.string.uuid(), content: 'A' });
    const workEntity = getDefaultWork({
      id: faker.string.uuid(),
      titles: [title],
      abstracts: [abstract],
      subjects: [{ id: faker.string.uuid(), type: SubjectTypes.enum.Keyword, code: '', ordinal: 1 }],
    });
    const createdId = faker.string.uuid();
    const createdTitleId = faker.string.uuid();
    const createdAbstractId = faker.string.uuid();
    const subjectErrorMessage = 'Subject failed';
    const abstractErrorMessage = 'Abstract failed';
    const deleteWorkErrorMessage = 'Delete work failed';

    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockResolvedValue([{ ...title, id: createdTitleId }]);

    (mockAbstractService.createAbstract as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...abstract,
      id: createdAbstractId,
    });

    (mockSubjectService.createSubject as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(subjectErrorMessage));

    (mockAbstractService.deleteAbstract as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const callOrder: string[] = [];
    (mockAbstractService.deleteAbstract as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push(abstractErrorMessage);
    });
    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ createWork: mockWorkDto(createdId, workEntity) })
      .mockImplementation(async () => {
        callOrder.push(deleteWorkErrorMessage);
      });

    const promise = workService.createWork(workEntity);

    await expect(promise).rejects.toThrow(subjectErrorMessage);
    expect(callOrder).toEqual([abstractErrorMessage, deleteWorkErrorMessage]);
  });
});

describe('createWork title stage with the real TitleService (thoth-app#183)', () => {
  it('rolls back a work whose plan has no title, exactly once, and creates nothing else', async () => {
    const mutation = vi.fn().mockResolvedValue({ createWork: { workId: 'created', titles: [] } });
    const graphqlService = { query: vi.fn(), mutation } as unknown as GraphqlService;
    const service = new WorkService({
      graphqlService,
      fundingService: {} as unknown as FundingService,
      subjectService: {} as unknown as SubjectService,
      contributionService: {} as unknown as ContributionService,
      publicationService: {} as unknown as PublicationService,
      languageService: {} as unknown as LanguageService,
      seriesService: {} as unknown as SeriesService,
      referenceService: {} as unknown as ReferenceService,
      titleService: new TitleService(graphqlService),
      abstractService: {} as unknown as AbstractService,
    });

    await expect(service.createWork(getDefaultWork({ id: 'w1', titles: [] }))).rejects.toThrow(
      'Must have at least one title',
    );
    expect(mutation.mock.calls.map(([, variables]) => variables)).toEqual([
      expect.objectContaining({ data: expect.anything() }),
      { workId: 'created' },
    ]);
  });
});

describe('createWork counts a bulk import states (thoth-app#183)', () => {
  /** Real Work mapper, every other stage empty: only the CreateWork payload is under test. */
  const serviceWith = (mutation: ReturnType<typeof vi.fn>) =>
    new WorkService({
      graphqlService: { query: vi.fn(), mutation } as unknown as GraphqlService,
      fundingService: {} as unknown as FundingService,
      subjectService: {} as unknown as SubjectService,
      contributionService: {} as unknown as ContributionService,
      publicationService: {} as unknown as PublicationService,
      languageService: {} as unknown as LanguageService,
      seriesService: {} as unknown as SeriesService,
      referenceService: {} as unknown as ReferenceService,
      titleService: { createTitles: vi.fn().mockResolvedValue([]) } as unknown as TitleService,
      abstractService: {} as unknown as AbstractService,
    });

  it('sends a count the import states as zero as 0, and leaves every other zero unset as before', async () => {
    const mutation = vi.fn().mockResolvedValue({ createWork: { workId: 'created', titles: [] } });

    await serviceWith(mutation).createWork(
      getDefaultWork({ id: 'w1', imageCount: 0, tableCount: 0, audioCount: 3, videoCount: 0 }),
      undefined,
      [],
      { tableCount: 0, audioCount: 3 },
    );

    expect(mutation.mock.calls[0][1].data).toMatchObject({
      imageCount: null,
      tableCount: 0,
      audioCount: 3,
      videoCount: null,
    });
  });

  it('keeps the payload of a work created without stated counts exactly as the mapper writes it', async () => {
    const mutation = vi.fn().mockResolvedValue({ createWork: { workId: 'created', titles: [] } });

    await serviceWith(mutation).createWork(getDefaultWork({ id: 'w1', imageCount: 0, tableCount: 4 }));

    expect(mutation.mock.calls[0][1].data).toEqual(
      (({ workId: _, ...dto }) => dto)(
        new WorkDtoMapper().toDto(getDefaultWork({ id: 'w1', imageCount: 0, tableCount: 4 })),
      ),
    );
  });
});

describe('bulkCreateWorks', () => {
  const ARC_COMPANIONS = 'Arc Companions';
  const IMPRINT_ID = 'imprint-a';
  const EXISTING_SERIES_ID = 'existing-series-id';
  const CREATED_SERIES_ID = 'created-series-id';

  let workService: WorkService;
  let mockSeriesService: SeriesService;
  let createWorkSpy: ReturnType<typeof vi.spyOn>;

  const proposedSeries = (name = ARC_COMPANIONS): ProposedSeries => ({
    name,
    imprintId: IMPRINT_ID,
    type: SeriesTypes.enum.BookSeries,
  });

  /** A series membership: which planned work, and its issue ordinal. */
  const member = (workId: string, orderNumber: number) => ({ workId, orderNumber });

  /** The plan a confirmed import runs, assembled the way a parser produces it. */
  const planOf = (works: WorkEntity[], series: SeriesImportPlan = [], chapters: WorkEntity[] = []): ImportPlan => ({
    works,
    chapters,
    series,
  });

  beforeEach(() => {
    mockSeriesService = {
      createSeries: vi.fn().mockImplementation(async (data) => ({ ...data, id: CREATED_SERIES_ID })),
      createIssue: vi.fn().mockResolvedValue({}),
    } as unknown as SeriesService;

    workService = new WorkService({
      graphqlService: {} as unknown as GraphqlService,
      fundingService: {} as unknown as FundingService,
      subjectService: {} as unknown as SubjectService,
      contributionService: {} as unknown as ContributionService,
      publicationService: {} as unknown as PublicationService,
      languageService: {} as unknown as LanguageService,
      seriesService: mockSeriesService,
      referenceService: {} as unknown as ReferenceService,
      titleService: {} as unknown as TitleService,
      abstractService: {} as unknown as AbstractService,
    });

    // bulkCreateWorks orchestrates; creating a work end to end is covered elsewhere.
    createWorkSpy = vi
      .spyOn(workService, 'createWork')
      .mockImplementation(async (work: WorkEntity) => ({ ...work, id: `created-${work.id}` }));
    vi.spyOn(workService, 'createChapter').mockResolvedValue(getDefaultWork({ id: 'chapter' }));
  });

  it('creates a missing series exactly once for every work that shares it', async () => {
    const works = [getDefaultWork({ id: 'w1' }), getDefaultWork({ id: 'w2' }), getDefaultWork({ id: 'w3' })];
    const plan: SeriesImportPlan = [
      {
        name: ARC_COMPANIONS,
        target: { kind: 'proposed', series: proposedSeries() },
        members: [member('w1', 1), member('w2', 2), member('w3', 3)],
      },
    ];

    await workService.bulkCreateWorks(planOf(works, plan));

    expect(mockSeriesService.createSeries).toHaveBeenCalledTimes(1);
    expect(mockSeriesService.createSeries).toHaveBeenCalledWith(
      expect.objectContaining({ name: ARC_COMPANIONS, imprintId: IMPRINT_ID, type: SeriesTypes.enum.BookSeries }),
    );
  });

  it('attaches every work to the series id the API returned', async () => {
    const works = [getDefaultWork({ id: 'w1' }), getDefaultWork({ id: 'w2' }), getDefaultWork({ id: 'w3' })];
    const plan: SeriesImportPlan = [
      {
        name: ARC_COMPANIONS,
        target: { kind: 'proposed', series: proposedSeries() },
        members: [member('w1', 1), member('w2', 2), member('w3', 3)],
      },
    ];

    await workService.bulkCreateWorks(planOf(works, plan));

    expect(mockSeriesService.createIssue).toHaveBeenCalledTimes(3);
    expect((mockSeriesService.createIssue as ReturnType<typeof vi.fn>).mock.calls.map(([call]) => call)).toEqual([
      { seriesId: CREATED_SERIES_ID, workId: 'created-w1', orderNumber: 1 },
      { seriesId: CREATED_SERIES_ID, workId: 'created-w2', orderNumber: 2 },
      { seriesId: CREATED_SERIES_ID, workId: 'created-w3', orderNumber: 3 },
    ]);
  });

  it('reuses an existing series without creating one', async () => {
    const works = [getDefaultWork({ id: 'w1' }), getDefaultWork({ id: 'w2' })];
    const plan: SeriesImportPlan = [
      {
        name: ARC_COMPANIONS,
        target: { kind: 'existing', seriesId: EXISTING_SERIES_ID },
        members: [member('w1', 4), member('w2', 5)],
      },
    ];

    await workService.bulkCreateWorks(planOf(works, plan));

    expect(mockSeriesService.createSeries).not.toHaveBeenCalled();
    expect((mockSeriesService.createIssue as ReturnType<typeof vi.fn>).mock.calls.map(([call]) => call)).toEqual([
      { seriesId: EXISTING_SERIES_ID, workId: 'created-w1', orderNumber: 4 },
      { seriesId: EXISTING_SERIES_ID, workId: 'created-w2', orderNumber: 5 },
    ]);
  });

  it('creates each planned series separately', async () => {
    (mockSeriesService.createSeries as ReturnType<typeof vi.fn>).mockImplementation(async (data) => ({
      ...data,
      id: `created-${data.name}`,
    }));

    const works = [getDefaultWork({ id: 'w1' }), getDefaultWork({ id: 'w2' })];
    const plan: SeriesImportPlan = [
      {
        name: ARC_COMPANIONS,
        target: { kind: 'proposed', series: proposedSeries() },
        members: [member('w1', 1)],
      },
      {
        name: 'Borderlines',
        target: { kind: 'proposed', series: proposedSeries('Borderlines') },
        members: [member('w2', 1)],
      },
    ];

    await workService.bulkCreateWorks(planOf(works, plan));

    expect(mockSeriesService.createSeries).toHaveBeenCalledTimes(2);
    expect(
      (mockSeriesService.createIssue as ReturnType<typeof vi.fn>).mock.calls.map(([call]) => call.seriesId),
    ).toEqual([`created-${ARC_COMPANIONS}`, 'created-Borderlines']);
  });

  it('does not create a series when no work that needs it was created', async () => {
    // Series creation is lazy, so a run that fails before reaching the series leaves no
    // orphan series behind.
    createWorkSpy.mockRejectedValue(new Error('work creation failed'));

    const plan: SeriesImportPlan = [
      {
        name: ARC_COMPANIONS,
        target: { kind: 'proposed', series: proposedSeries() },
        members: [member('w1', 1)],
      },
    ];

    await expect(workService.bulkCreateWorks(planOf([getDefaultWork({ id: 'w1' })], plan))).rejects.toThrow(
      'work creation failed',
    );

    expect(mockSeriesService.createSeries).not.toHaveBeenCalled();
    expect(mockSeriesService.createIssue).not.toHaveBeenCalled();
  });

  it('keeps a series it already created when a later work fails', async () => {
    createWorkSpy
      .mockImplementationOnce(async (work: WorkEntity) => ({ ...work, id: `created-${work.id}` }))
      .mockRejectedValueOnce(new Error('second work failed'));

    const works = [getDefaultWork({ id: 'w1' }), getDefaultWork({ id: 'w2' })];
    const plan: SeriesImportPlan = [
      {
        name: ARC_COMPANIONS,
        target: { kind: 'proposed', series: proposedSeries() },
        members: [member('w1', 1), member('w2', 2)],
      },
    ];

    await expect(workService.bulkCreateWorks(planOf(works, plan))).rejects.toThrow('second work failed');

    // The first work was created and its issue points at the new series, so the series must
    // survive; deleting it would orphan a successfully imported work.
    expect(mockSeriesService.createSeries).toHaveBeenCalledTimes(1);
    expect(mockSeriesService.createIssue).toHaveBeenCalledTimes(1);
    expect((mockSeriesService.createIssue as ReturnType<typeof vi.fn>).mock.calls[0][0].seriesId).toBe(
      CREATED_SERIES_ID,
    );
  });

  it('hands a CSV work no stated counts, exactly as before: an ONIX plan’s are its execution units’ (thoth-app#187)', async () => {
    await workService.bulkCreateWorks(planOf([getDefaultWork({ id: 'csv' })]));

    const calls = createWorkSpy.mock.calls as Parameters<WorkService['createWork']>[];

    expect(calls.map(([work, , intents, counts]) => [work.id, intents, counts])).toEqual([['csv', [], {}]]);
  });

  it('leaves works with no planned series untouched', async () => {
    await workService.bulkCreateWorks(planOf([getDefaultWork({ id: 'w1' })]));

    expect(mockSeriesService.createSeries).not.toHaveBeenCalled();
    expect(mockSeriesService.createIssue).not.toHaveBeenCalled();
  });

  it('attaches a work to every Series the plan names it in, with the issue number the source states', async () => {
    const plan: SeriesImportPlan = [
      {
        name: ARC_COMPANIONS,
        target: { kind: 'existing', seriesId: EXISTING_SERIES_ID },
        members: [{ workId: 'w1', orderNumber: 4, issueNumber: 12 }],
      },
      {
        name: 'Borderlines',
        target: { kind: 'proposed', series: { ...proposedSeries('Borderlines'), issnPrint: '', issnDigital: '2515-7310' } },
        members: [{ workId: 'w1', orderNumber: 1, issueNumber: null }],
      },
    ];

    await workService.bulkCreateWorks(planOf([getDefaultWork({ id: 'w1' })], plan));

    expect(mockSeriesService.createSeries).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ name: 'Borderlines', issnPrint: '', issnDigital: '2515-7310' }),
    );
    expect((mockSeriesService.createIssue as ReturnType<typeof vi.fn>).mock.calls.map(([call]) => call)).toEqual([
      { seriesId: EXISTING_SERIES_ID, workId: 'created-w1', orderNumber: 4, issueNumber: 12 },
      { seriesId: CREATED_SERIES_ID, workId: 'created-w1', orderNumber: 1, issueNumber: null },
    ]);
  });
});

describe('bulkCreateWorks execution observer', () => {
  const IMPRINT_ID = 'imprint-a';

  let workService: WorkService;
  let mockSeriesService: SeriesService;
  let createWorkSpy: ReturnType<typeof vi.spyOn>;
  let createChapterSpy: ReturnType<typeof vi.spyOn>;

  const proposedSeries = (name = 'Arc Companions'): ProposedSeries => ({
    name,
    imprintId: IMPRINT_ID,
    type: SeriesTypes.enum.BookSeries,
  });

  const member = (workId: string, orderNumber: number) => ({ workId, orderNumber });

  const titledWork = (id: string, title: string, extra: Partial<WorkEntity> = {}): WorkEntity =>
    getDefaultWork({ id, titles: [getDefaultTitle({ title })], ...extra });

  const chapterOf = (id: string, relationId: string): WorkEntity => ({ ...getDefaultWork({ id }), relationId });

  const planOf = (works: WorkEntity[], series: SeriesImportPlan = [], chapters: WorkEntity[] = []): ImportPlan => ({
    works,
    chapters,
    series,
  });

  const record = () => {
    const events: ImportExecutionProgress[] = [];
    return { events, observer: { onProgress: (progress: ImportExecutionProgress) => events.push(progress) } };
  };

  beforeEach(() => {
    mockSeriesService = {
      createSeries: vi.fn().mockImplementation(async (data) => ({ ...data, id: 'created-series' })),
      createIssue: vi.fn().mockResolvedValue({}),
    } as unknown as SeriesService;

    workService = new WorkService({
      graphqlService: {} as unknown as GraphqlService,
      fundingService: {} as unknown as FundingService,
      subjectService: {} as unknown as SubjectService,
      contributionService: {} as unknown as ContributionService,
      publicationService: {} as unknown as PublicationService,
      languageService: {} as unknown as LanguageService,
      seriesService: mockSeriesService,
      referenceService: {} as unknown as ReferenceService,
      titleService: {} as unknown as TitleService,
      abstractService: {} as unknown as AbstractService,
    });

    createWorkSpy = vi
      .spyOn(workService, 'createWork')
      .mockImplementation(async (work: WorkEntity) => ({ ...work, id: `created-${work.id}` }));
    createChapterSpy = vi.spyOn(workService, 'createChapter').mockResolvedValue(getDefaultWork({ id: 'chapter' }));
  });

  it('initialises the total and walks the top-level works in plan order', async () => {
    const works = [titledWork('w1', 'One'), titledWork('w2', 'Two'), titledWork('w3', 'Three')];
    const { events, observer } = record();

    await workService.bulkCreateWorks(planOf(works), observer);

    // Every reading agrees on the total, and the work stage is emitted once per work, in order.
    expect(events.every((event) => event.total === 3)).toBe(true);
    const workStage = events.filter((event) => event.stage === 'work');
    expect(workStage.map((event) => event.current.position)).toEqual([1, 2, 3]);
    expect(workStage.map((event) => event.current.title)).toEqual(['One', 'Two', 'Three']);
    // completed is the number finished before the current work: 0, then 1, then 2.
    expect(workStage.map((event) => event.completed)).toEqual([0, 1, 2]);
  });

  it('reports the work, chapter and series stages in order, with the work identity and chapter count', async () => {
    const work = titledWork('w1', 'One', { doi: '10.1/one' });
    const chapters = [chapterOf('c1', 'w1'), chapterOf('c2', 'w1')];
    const series: SeriesImportPlan = [
      { name: 'Arc Companions', target: { kind: 'proposed', series: proposedSeries() }, members: [member('w1', 1)] },
    ];
    const { events, observer } = record();

    await workService.bulkCreateWorks(planOf([work], series, chapters), observer);

    expect(events.map((event) => event.stage)).toEqual(['work', 'chapters', 'series']);
    // None of the three counts the work as done; it is still in flight through all of them.
    expect(events.every((event) => event.completed === 0)).toBe(true);
    expect(events[0].current).toMatchObject({ position: 1, title: 'One', reference: '10.1/one', chapterCount: 2 });
  });

  it('falls back from DOI to the source reference for the work identifier, and to none when neither exists', async () => {
    const withReference = titledWork('w1', 'One', { doi: '', reference: 'ARC-001' });
    const withNeither = titledWork('w2', 'Two', { doi: '', reference: '' });
    const { events, observer } = record();

    await workService.bulkCreateWorks(planOf([withReference, withNeither]), observer);

    const workStage = events.filter((event) => event.stage === 'work');
    expect(workStage[0].current.reference).toBe('ARC-001');
    expect(workStage[1].current.reference).toBeUndefined();
  });

  it('does not count a work as completed until its chapters and series steps have finished', async () => {
    const log: string[] = [];
    createChapterSpy.mockImplementation(async () => {
      log.push('chapter');
      return getDefaultWork({ id: 'chapter' });
    });
    (mockSeriesService.createIssue as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      log.push('issue');
    });

    const works = [titledWork('w1', 'One'), titledWork('w2', 'Two')];
    const chapters = [chapterOf('c1', 'w1')];
    const series: SeriesImportPlan = [
      { name: 'Arc Companions', target: { kind: 'proposed', series: proposedSeries() }, members: [member('w1', 1)] },
    ];

    await workService.bulkCreateWorks(planOf(works, series, chapters), {
      onProgress: (progress) =>
        log.push(`stage:${progress.stage}:w${progress.current.position}:done=${progress.completed}`),
    });

    // The second work's first reading (done=1) appears only after the first work's chapter and
    // issue have both run: completed does not advance until the whole path has returned.
    expect(log).toEqual([
      'stage:work:w1:done=0',
      'stage:chapters:w1:done=0',
      'chapter',
      'stage:series:w1:done=0',
      'issue',
      'stage:work:w2:done=1',
    ]);
  });

  it('stops after a sub-stage failure, preserves the original message with context, and never starts later works', async () => {
    const works = [titledWork('w1', 'One'), titledWork('w2', 'Two', { doi: '10.2/two' }), titledWork('w3', 'Three')];
    // Only the second work has a chapter, so the single chapter creation is the one that fails.
    const chapters = [chapterOf('c1', 'w2')];
    createChapterSpy.mockRejectedValue(new Error('chapter boom'));

    const { events, observer } = record();
    const error = await workService.bulkCreateWorks(planOf(works, [], chapters), observer).catch((thrown) => thrown);

    expect(error).toBeInstanceOf(ImportExecutionError);
    // The original, useful message is the thrown error's own message — not rewritten.
    expect(error.message).toBe('chapter boom');
    expect(error.cause).toBeInstanceOf(Error);
    expect(error.context).toMatchObject({
      total: 3,
      completed: 1,
      stage: 'chapters',
      current: { position: 2, title: 'Two', reference: '10.2/two' },
    });

    // The first two works were reached; the third was never started.
    expect(createWorkSpy).toHaveBeenCalledTimes(2);
    expect(events.some((event) => event.current.position === 3)).toBe(false);
  });

  it('does not change the sequence of mutations when an observer is attached', async () => {
    const works = [titledWork('w1', 'One'), titledWork('w2', 'Two')];
    const chapters = [chapterOf('c1', 'w1')];
    const series: SeriesImportPlan = [
      {
        name: 'Arc Companions',
        target: { kind: 'proposed', series: proposedSeries() },
        members: [member('w1', 1), member('w2', 2)],
      },
    ];

    const instrument = () => {
      const log: string[] = [];
      createWorkSpy.mockImplementation(async (work: WorkEntity) => {
        log.push(`work:${work.id}`);
        return { ...work, id: `created-${work.id}` };
      });
      createChapterSpy.mockImplementation(async (_chapter: WorkEntity, _relatedWorkId: string, ordinal: number) => {
        log.push(`chapter:${ordinal}`);
        return getDefaultWork({ id: 'chapter' });
      });
      (mockSeriesService.createSeries as ReturnType<typeof vi.fn>).mockImplementation(async (data) => {
        log.push('series');
        return { ...data, id: 'created-series' };
      });
      (mockSeriesService.createIssue as ReturnType<typeof vi.fn>).mockImplementation(async (issue) => {
        log.push(`issue:${issue.workId}`);
      });
      return log;
    };

    const withoutObserver = instrument();
    await workService.bulkCreateWorks(planOf(works, series, chapters));

    const withObserver = instrument();
    await workService.bulkCreateWorks(planOf(works, series, chapters), { onProgress: () => {} });

    expect(withObserver).toEqual(withoutObserver);
    expect(withObserver).toEqual(['work:w1', 'chapter:1', 'series', 'issue:created-w1', 'work:w2', 'issue:created-w2']);
  });

  it('isolates a throwing observer: every mutation still runs, in the same order, and the run does not fail', async () => {
    const works = [titledWork('w1', 'One'), titledWork('w2', 'Two')];
    const chapters = [chapterOf('c1', 'w1')];
    const series: SeriesImportPlan = [
      {
        name: 'Arc Companions',
        target: { kind: 'proposed', series: proposedSeries() },
        members: [member('w1', 1), member('w2', 2)],
      },
    ];

    // Records the exact sequence of mutations, so the throwing run can be compared against a clean
    // one. Reset between runs so each run's sequence stands alone.
    const instrument = () => {
      const log: string[] = [];
      createWorkSpy.mockImplementation(async (work: WorkEntity) => {
        log.push(`work:${work.id}`);
        return { ...work, id: `created-${work.id}` };
      });
      createChapterSpy.mockImplementation(async (_chapter: WorkEntity, _relatedWorkId: string, ordinal: number) => {
        log.push(`chapter:${ordinal}`);
        return getDefaultWork({ id: 'chapter' });
      });
      (mockSeriesService.createSeries as ReturnType<typeof vi.fn>).mockImplementation(async (data) => {
        log.push('series');
        return { ...data, id: 'created-series' };
      });
      (mockSeriesService.createIssue as ReturnType<typeof vi.fn>).mockImplementation(async (issue) => {
        log.push(`issue:${issue.workId}`);
      });
      return log;
    };

    // Baseline: the mutation sequence with no observer at all.
    const baseline = instrument();
    await workService.bulkCreateWorks(planOf(works, series, chapters));

    // An observer that throws on every single reading, at every stage of every work.
    const onProgress = vi.fn(() => {
      throw new Error('observer boom');
    });
    // The throw is caught and logged inside the service, never surfaced; silence it here.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const withThrowingObserver = instrument();
    // The run resolves normally: the observer's failure never became an ImportExecutionError.
    await expect(workService.bulkCreateWorks(planOf(works, series, chapters), { onProgress })).resolves.toBeUndefined();

    // The throwing path was actually exercised — the observer was called and did throw.
    expect(onProgress).toHaveBeenCalled();
    // Yet the mutations ran identically to the observer-free run: same set, same order. A throw
    // before a mutation never prevented it, and a throw during one work never stopped the next.
    expect(withThrowingObserver).toEqual(baseline);
    expect(withThrowingObserver).toEqual([
      'work:w1',
      'chapter:1',
      'series',
      'issue:created-w1',
      'work:w2',
      'issue:created-w2',
    ]);
    // The failure was handled where it happened — logged, not raised to the caller.
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

/**
 * Issue #135. A bulk import may carry the same ORCID on several source occurrences: the same
 * author on two books, on two chapters of one book, or in two roles on one work. The backend
 * protects `contributor.orcid` with a unique index, so the app may only ever attempt one
 * creation per ORCID per import — and, because works create their contributions concurrently
 * and chapters run concurrently too, "one attempt" has to hold for simultaneous occurrences as
 * well as for later books.
 *
 * These run the real ContributionService against a mocked API so the assertions are about the
 * mutations an import would actually send.
 */
describe('bulkCreateWorks contributor identity (issue #135)', () => {
  const ORCID = 'https://orcid.org/0000-0001-6365-5189';
  const OTHER_ORCID = 'https://orcid.org/0000-0002-1825-0097';

  let workService: WorkService;
  let contributionService: ContributionService;
  let mockContributorService: ContributorService;
  let mockGraphqlService: GraphqlService;
  let createdContributions: Array<{ workId: string; contributorId: string; contributionType: string }>;

  /** A planned contribution the parser could not resolve to an existing contributor. */
  const newContributorContribution = (overrides?: Partial<WorkContribution>): WorkContribution =>
    getDefaultContribution({
      contributorId: appConfig.defaultId,
      fullName: 'Jane Doe',
      lastName: 'Doe',
      firstName: 'Jane',
      orcidId: ORCID,
      ...overrides,
    });

  const planOf = (works: WorkEntity[], chapters: WorkEntity[] = []): ImportPlan => ({
    works,
    chapters,
    series: [],
  });

  beforeEach(() => {
    createdContributions = [];
    let contributorSequence = 0;

    mockContributorService = {
      createContributor: vi.fn().mockImplementation(async (data: { orcid: string }) => {
        contributorSequence += 1;
        // Taken before the wait, so two creations in flight at once each keep their own id.
        const id = `contributor-${contributorSequence}`;

        // A real create is not instantaneous: the gap is where a completed-value-only cache
        // would let a second occurrence start its own create before the first one landed.
        await new Promise((resolve) => setTimeout(resolve, 5));

        return { id, orcid: data.orcid };
      }),
    } as unknown as ContributorService;

    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn().mockImplementation(async (_document: unknown, variables: Record<string, never>) => {
        const data = (variables as { data?: Record<string, string> }).data ?? {};

        if ('contributionType' in data) {
          createdContributions.push({
            workId: data.workId,
            contributorId: data.contributorId,
            contributionType: data.contributionType,
          });

          return { createContribution: { contributionId: `contribution-${createdContributions.length}` } };
        }

        return { createWork: { workId: `created-${createdContributions.length}-${Math.random()}` } };
      }),
    } as unknown as GraphqlService;

    contributionService = new ContributionService({
      graphqlService: mockGraphqlService,
      contributorService: mockContributorService,
      affiliationService: { createAffiliation: vi.fn() } as unknown as AffiliationService,
    });

    const mapper = new WorkDtoMapper();
    vi.spyOn(mapper, 'toDto').mockImplementation((entity: WorkEntity) => ({ workId: entity.id }) as unknown as WorkDto);
    vi.spyOn(mapper, 'toEntity').mockImplementation((dto: WorkDto) => getDefaultWork({ id: dto.workId }));

    workService = new WorkService({
      graphqlService: mockGraphqlService,
      fundingService: {} as unknown as FundingService,
      subjectService: {} as unknown as SubjectService,
      contributionService,
      publicationService: {} as unknown as PublicationService,
      languageService: {} as unknown as LanguageService,
      seriesService: {} as unknown as SeriesService,
      referenceService: {} as unknown as ReferenceService,
      titleService: { createTitles: vi.fn().mockResolvedValue([]) } as unknown as TitleService,
      abstractService: {} as unknown as AbstractService,
    });
  });

  it('creates one contributor for the same new ORCID across sequential top-level works', async () => {
    // The reported Tilburg failure in miniature: book 1 creates the contributor, and book 2
    // used to try to create the same ORCID again, which the unique index correctly rejected.
    const works = [
      getDefaultWork({ id: 'w1', contributions: [newContributorContribution()] }),
      getDefaultWork({ id: 'w2', contributions: [newContributorContribution()] }),
    ];

    await workService.bulkCreateWorks(planOf(works));

    expect(mockContributorService.createContributor).toHaveBeenCalledTimes(1);
    expect(createdContributions).toHaveLength(2);
    expect(new Set(createdContributions.map(({ contributorId }) => contributorId)).size).toBe(1);
    expect(createdContributions[0].contributorId).toBe('contributor-1');
  });

  it('shares one in-flight creation between concurrent same-ORCID contributions of one work', async () => {
    // Distinct roles: two contributions of the same type on one work collide on a different
    // constraint entirely, so this stays a test about contributor identity.
    const work = getDefaultWork({
      id: 'w1',
      contributions: [
        newContributorContribution({ type: ContributorTypes.enum.Author, orderNumber: 1 }),
        newContributorContribution({ type: ContributorTypes.enum.Editor, orderNumber: 2 }),
      ],
    });

    await workService.bulkCreateWorks(planOf([work]));

    expect(mockContributorService.createContributor).toHaveBeenCalledTimes(1);
    expect(createdContributions.map(({ contributorId }) => contributorId)).toEqual([
      'contributor-1',
      'contributor-1',
    ]);
    expect(createdContributions.map(({ contributionType }) => contributionType)).toEqual([
      ContributorTypes.enum.Author,
      ContributorTypes.enum.Editor,
    ]);
  });

  it('shares the registry between concurrent chapter paths of one top-level work', async () => {
    const works = [getDefaultWork({ id: 'w1', contributions: [] })];
    const chapters = [
      getDefaultWork({ id: 'c1', relationId: 'w1', contributions: [newContributorContribution()] }),
      getDefaultWork({ id: 'c2', relationId: 'w1', contributions: [newContributorContribution()] }),
    ];

    await workService.bulkCreateWorks(planOf(works, chapters));

    expect(mockContributorService.createContributor).toHaveBeenCalledTimes(1);
    expect(new Set(createdContributions.map(({ contributorId }) => contributorId)).size).toBe(1);
  });

  it('creates distinct contributors for different ORCIDs carrying the same name', async () => {
    const works = [
      getDefaultWork({ id: 'w1', contributions: [newContributorContribution()] }),
      getDefaultWork({ id: 'w2', contributions: [newContributorContribution({ orcidId: OTHER_ORCID })] }),
    ];

    await workService.bulkCreateWorks(planOf(works));

    expect(mockContributorService.createContributor).toHaveBeenCalledTimes(2);
    expect(createdContributions.map(({ contributorId }) => contributorId)).toEqual([
      'contributor-1',
      'contributor-2',
    ]);
  });

  it('never deduplicates blank-ORCID contributors through the registry', async () => {
    // Two people can share a name. Without an ORCID the import has no identity signal at all,
    // and inferring one from the name is exactly what this task must not do.
    const works = [
      getDefaultWork({ id: 'w1', contributions: [newContributorContribution({ orcidId: '' })] }),
      getDefaultWork({ id: 'w2', contributions: [newContributorContribution({ orcidId: '' })] }),
    ];

    await workService.bulkCreateWorks(planOf(works));

    expect(mockContributorService.createContributor).toHaveBeenCalledTimes(2);
    expect(createdContributions.map(({ contributorId }) => contributorId)).toEqual([
      'contributor-1',
      'contributor-2',
    ]);
  });

  it('leaves an existing contributor id alone: no creation, no registry entry', async () => {
    const works = [
      getDefaultWork({
        id: 'w1',
        contributions: [newContributorContribution({ contributorId: 'existing-contributor' })],
      }),
      getDefaultWork({
        id: 'w2',
        contributions: [newContributorContribution({ contributorId: 'existing-contributor' })],
      }),
    ];

    await workService.bulkCreateWorks(planOf(works));

    expect(mockContributorService.createContributor).not.toHaveBeenCalled();
    expect(createdContributions.map(({ contributorId }) => contributorId)).toEqual([
      'existing-contributor',
      'existing-contributor',
    ]);
  });

  it('fails the import when the shared contributor creation genuinely rejects', async () => {
    const failure = new Error('A contributor with this ORCID ID already exists.');
    vi.mocked(mockContributorService.createContributor).mockRejectedValue(failure);

    const works = [
      getDefaultWork({ id: 'w1', contributions: [newContributorContribution()] }),
      getDefaultWork({ id: 'w2', contributions: [newContributorContribution()] }),
    ];

    await expect(workService.bulkCreateWorks(planOf(works))).rejects.toBeInstanceOf(ImportExecutionError);
    // Stopped on the first work, exactly as a failed creation always did: sharing identity must
    // not convert a rejection into a reusable success.
    expect(createdContributions).toHaveLength(0);
  });

  it('starts every bulk import with a fresh registry', async () => {
    const first = [getDefaultWork({ id: 'w1', contributions: [newContributorContribution()] })];
    const second = [getDefaultWork({ id: 'w2', contributions: [newContributorContribution()] })];

    await workService.bulkCreateWorks(planOf(first));
    await workService.bulkCreateWorks(planOf(second));

    // A contributor id cached in memory from an earlier import says nothing about what exists
    // now, so the second import resolves the ORCID through its own creation.
    expect(mockContributorService.createContributor).toHaveBeenCalledTimes(2);
    expect(createdContributions.map(({ contributorId }) => contributorId)).toEqual([
      'contributor-1',
      'contributor-2',
    ]);
  });

  it('creates one new contributor for every contribution one source contributor makes on a work or chapter', async () => {
    const editor = newContributorContribution({ orcidId: '', type: ContributorTypes.enum.Editor, orderNumber: 1 });
    const translator = newContributorContribution({ orcidId: '', type: ContributorTypes.enum.Translator, orderNumber: 2 });
    const namesake = newContributorContribution({ orcidId: '', type: ContributorTypes.enum.Author, orderNumber: 3 });
    const work = getDefaultWork({ id: 'w1', contributions: [editor, translator, namesake] });
    const chapter = getDefaultWork({ id: 'c1', relationId: 'w1', contributions: [{ ...editor }, { ...translator }] });
    const plan: ImportPlan = {
      ...planOf([work], [chapter]),
      execution: {
        units: [
          {
            unitKey: 'UNIT|g1',
            sourceOrder: 1,
            groupKey: 'g1',
            target: { kind: 'PLANNED_WORK', workId: 'w1' },
            display: { title: 'w1', reference: null },
            actions: [
              { kind: 'CREATE_WORK', actionKey: 'UNIT|g1|WORK', workId: 'w1' },
              {
                kind: 'CREATE_CHAPTER',
                actionKey: 'UNIT|g1|CHAPTER|c1',
                workId: 'c1',
                parent: { kind: 'PLANNED_WORK', workId: 'w1' },
                ordinal: 1,
              },
            ],
          },
        ],
      },
      onix: {
        descriptive: {
          findings: [],
          compatibility: [],
          contributorIntents: [
            { workId: 'w1', key: 'intent-work', ordinals: [1, 2] },
            { workId: 'w1', key: 'intent-namesake', ordinals: [3] },
            { workId: 'c1', key: 'intent-chapter', ordinals: [1, 2] },
          ],
        },
      } as unknown as ImportPlan['onix'],
    };

    await workService.bulkCreateWorks(plan);

    // One person with two roles is one contributor; a namesake with no shared intent is never merged into them.
    expect(mockContributorService.createContributor).toHaveBeenCalledTimes(3);
    // The work's contributions all land before its chapters start.
    const contributorOf = (contributions: typeof createdContributions, type: string) =>
      contributions.find(({ contributionType }) => contributionType === type)?.contributorId;
    const workContributions = createdContributions.slice(0, 3);
    const chapterContributions = createdContributions.slice(3);

    expect(workContributions.map(({ contributionType }) => contributionType).sort()).toEqual(['AUTHOR', 'EDITOR', 'TRANSLATOR']);
    expect(contributorOf(workContributions, 'TRANSLATOR')).toBe(contributorOf(workContributions, 'EDITOR'));
    expect(contributorOf(workContributions, 'AUTHOR')).not.toBe(contributorOf(workContributions, 'EDITOR'));
    expect(chapterContributions).toHaveLength(2);
    expect(contributorOf(chapterContributions, 'TRANSLATOR')).toBe(contributorOf(chapterContributions, 'EDITOR'));
    expect(contributorOf(chapterContributions, 'EDITOR')).not.toBe(contributorOf(workContributions, 'EDITOR'));
  });

  it('leaves ordinary non-bulk work creation without any registry', async () => {
    const work = getDefaultWork({
      id: 'w1',
      contributions: [
        newContributorContribution({ type: ContributorTypes.enum.Author, orderNumber: 1 }),
        newContributorContribution({ type: ContributorTypes.enum.Editor, orderNumber: 2 }),
      ],
    });

    await workService.createWork(work);

    // Outside an import there is no execution to scope a registry to, so both occurrences
    // create independently — the behaviour this path has always had.
    expect(mockContributorService.createContributor).toHaveBeenCalledTimes(2);
  });
});

describe('bulkCreateWorks ONIX execution units (thoth-app#187)', () => {
  type Variables = Record<string, never> & Record<string, unknown>;
  type Write = { readonly op: string; readonly variables: Record<string, unknown> };
  type Respond = (variables: Variables) => unknown;

  /** The operation a GraphQL document performs, so the fake API can answer it as the backend would. */
  const operationOf = (document: unknown) =>
    (document as { definitions: { kind: string; name?: { value: string } }[] }).definitions.find(
      ({ kind }) => kind === 'OperationDefinition',
    )?.name?.value ?? 'UNKNOWN';

  let writes: Write[];
  let overrides: Map<string, Respond>;
  let progress: ImportExecutionProgress[];
  let sequence: number;
  let service: WorkService;
  let mapper: WorkDtoMapper;
  let publicationService: PublicationService;
  let seriesService: SeriesService;
  let contributorService: ContributorService;

  const next = () => (sequence += 1);

  /** What the backend returns for each mutation: a create names the new id, a delete the id it deleted. */
  const defaults: Record<string, Respond> = {
    CreateWork: ({ data }) => ({ createWork: { workId: `db-${(data as { reference: string }).reference}` } }),
    CreateWorkRelation: () => ({ createWorkRelation: { workRelationId: `relation-${next()}` } }),
    CreateAdditionalResource: () => ({ createAdditionalResource: { workResourceId: `resource-${next()}` } }),
    CreateBookReview: () => ({ createBookReview: { bookReviewId: `review-${next()}` } }),
    CreateEndorsement: () => ({ createEndorsement: { endorsementId: `endorsement-${next()}` } }),
    CreateAward: () => ({ createAward: { awardId: `award-${next()}` } }),
    CreateContribution: () => ({ createContribution: { contributionId: `contribution-${next()}` } }),
    DeleteWork: ({ workId }) => ({ deleteWork: { workId } }),
    DeleteWorkRelation: ({ workRelationId }) => ({ deleteWorkRelation: { workRelationId } }),
    DeleteAdditionalResource: ({ additionalResourceId }) => ({
      deleteAdditionalResource: { workResourceId: additionalResourceId },
    }),
    DeleteBookReview: ({ bookReviewId }) => ({ deleteBookReview: { bookReviewId } }),
    DeleteEndorsement: ({ endorsementId }) => ({ deleteEndorsement: { endorsementId } }),
    DeleteAward: ({ awardId }) => ({ deleteAward: { awardId } }),
  };

  const ops = () => writes.map(({ op }) => op);
  const writesOf = (op: string) => writes.filter((write) => write.op === op).map(({ variables }) => variables);
  /** The stage each reading reported, in order, per unit position. */
  const stages = () => progress.map(({ current, stage }) => `${current.position}:${stage}`);

  const work = (id: string, overrides: Partial<WorkEntity> = {}) => getDefaultWork({ id, reference: id, ...overrides });
  const planned = (workId: string): ImportWorkRef => ({ kind: 'PLANNED_WORK', workId });
  const existing = (workId: string): ImportWorkRef => ({ kind: 'EXISTING_WORK', workId });
  const unit = (
    sourceOrder: number,
    target: ImportWorkRef,
    actions: ImportExecutionAction[],
    title = `Unit ${sourceOrder}`,
  ): ImportExecutionUnit => ({
    unitKey: `UNIT|g${sourceOrder}`,
    sourceOrder,
    groupKey: `g${sourceOrder}`,
    target,
    display: { title, reference: null },
    actions,
  });
  const createWork = (workId: string): ImportExecutionAction => ({
    kind: 'CREATE_WORK',
    actionKey: `${workId}|WORK`,
    workId,
  });
  const createPublication = (workId: string, index: number): ImportExecutionAction => ({
    kind: 'CREATE_PUBLICATION',
    actionKey: `${workId}|PUBLICATION|${index}`,
    work: planned(workId),
    productKey: `${workId}-product-${index}`,
    publication: { source: 'WORK', index },
  });
  const attach = (workId: string, isbn: string): ImportExecutionAction => ({
    kind: 'CREATE_PUBLICATION',
    actionKey: `${workId}|PUBLICATION|${isbn}`,
    work: existing(workId),
    productKey: isbn,
    publication: {
      source: 'ATTACHMENT',
      publication: getDefaultPublication({ isbn, type: PublicationType.enum.Hardback }),
    },
  });
  const createChild = (
    kind: 'CREATE_CHAPTER' | 'CREATE_CONTAINED_WORK',
    workId: string,
    parent: string,
    ordinal: number,
  ): ImportExecutionAction => ({
    kind,
    actionKey: `${parent}|${kind}|${workId}`,
    workId,
    parent: planned(parent),
    ordinal,
  });
  const createResource = (
    target: ImportWorkRef,
    title: string,
    orderNumber: number,
    markupFormat: MarkupFormat.Html | MarkupFormat.JatsXml | MarkupFormat.PlainText = MarkupFormat.PlainText,
  ): ImportExecutionAction => ({
    kind: 'CREATE_ADDITIONAL_RESOURCE',
    actionKey: `${target.workId}|ADDITIONAL_RESOURCE|${title}`,
    work: target,
    resource: {
      id: appConfig.defaultId,
      workId: '',
      title,
      description: `About ${title}`,
      attribution: '',
      resourceType: 'VIDEO',
      doi: '',
      handle: '',
      url: `https://example.org/${title}`,
      date: null,
      fileUrl: '',
      orderNumber,
    },
    markupFormat,
  });
  const createReview = (
    target: ImportWorkRef,
    text: string,
    orderNumber: number,
    markupFormat: MarkupFormat.Html | MarkupFormat.JatsXml | MarkupFormat.PlainText = MarkupFormat.PlainText,
  ): ImportExecutionAction => ({
    kind: 'CREATE_BOOK_REVIEW',
    actionKey: `${target.workId}|BOOK_REVIEW|${orderNumber}`,
    work: target,
    review: {
      id: appConfig.defaultId,
      workId: '',
      title: '',
      authorName: 'A Reviewer',
      reviewerOrcid: '',
      reviewerInstitutionId: '',
      reviewerInstitutionName: '',
      reviewerInstitutionRor: '',
      url: '',
      doi: '',
      reviewDate: '',
      journalName: '',
      journalVolume: '',
      journalNumber: '',
      journalIssn: '',
      pageRange: '',
      text,
      orderNumber,
    },
    markupFormat,
  });
  const createEndorsement = (
    target: ImportWorkRef,
    text: string,
    orderNumber: number,
    markupFormat: MarkupFormat.Html | MarkupFormat.JatsXml | MarkupFormat.PlainText = MarkupFormat.PlainText,
  ): ImportExecutionAction => ({
    kind: 'CREATE_ENDORSEMENT',
    actionKey: `${target.workId}|ENDORSEMENT|${orderNumber}`,
    work: target,
    endorsement: {
      id: appConfig.defaultId,
      workId: '',
      authorName: 'An Endorser',
      authorOrcid: '',
      authorRole: '',
      authorInstitutionId: '',
      authorInstitutionName: '',
      authorInstitutionRor: '',
      url: '',
      text,
      orderNumber,
    },
    markupFormat,
  });
  const createAward = (
    target: ImportWorkRef,
    title: string,
    orderNumber: number,
    markupFormat: MarkupFormat.Html | MarkupFormat.JatsXml | MarkupFormat.PlainText = MarkupFormat.PlainText,
  ): ImportExecutionAction => ({
    kind: 'CREATE_AWARD',
    actionKey: `${target.workId}|AWARD|${orderNumber}`,
    work: target,
    award: {
      id: appConfig.defaultId,
      workId: '',
      title,
      url: '',
      category: '',
      statement: 'For its argument.',
      role: AwardRoles.enum.Winner,
      orderNumber,
      jury: '',
      year: '2024',
      country: null,
    },
    markupFormat,
  });
  const relate = (relationKey: string): ImportExecutionAction => ({
    kind: 'CREATE_WORK_RELATION',
    actionKey: `RELATION|${relationKey}`,
    relationKey,
  });
  const edge = (
    key: string,
    relator: ImportWorkRef,
    related: ImportWorkRef,
    relationOrdinal = 1,
  ): ImportRelationEdge => ({
    key,
    relator,
    related,
    relationType: 'HAS_TRANSLATION',
    relationOrdinal,
    status: 'PLANNED',
  });

  /** A confirmed ONIX plan as the resolver hands it over: payloads, and the units that own every write. */
  const onixPlan = ({
    works = [],
    chapters = [],
    containedWorks = [],
    series = [],
    relations = [],
    units,
    contributorIntents = [],
    statedCounts = [],
  }: {
    works?: WorkEntity[];
    chapters?: WorkEntity[];
    containedWorks?: WorkEntity[];
    series?: SeriesImportPlan;
    relations?: ImportRelationEdge[];
    units: ImportExecutionUnit[];
    contributorIntents?: { workId: string; key: string; ordinals: number[] }[];
    statedCounts?: { workId: string; counts: Record<string, number> }[];
  }): ImportPlan => ({
    works,
    chapters,
    series,
    containedWorks,
    relations,
    execution: { units },
    onix: {
      descriptive: { findings: [], compatibility: [], contributorIntents, statedCounts },
    } as unknown as ImportPlan['onix'],
  });

  const run = async (plan: ImportPlan) =>
    service.bulkCreateWorks(plan, { onProgress: (reading) => progress.push(reading) });
  /** Runs a plan that must fail, and hands back the error it failed with. */
  const failure = async (plan: ImportPlan) => {
    const error = await run(plan).then(
      () => null,
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(ImportExecutionError);

    return error as ImportExecutionError;
  };
  const fail = (op: string, message = `${op} refused`) =>
    overrides.set(op, () => {
      throw new Error(message);
    });

  beforeEach(() => {
    writes = [];
    overrides = new Map();
    progress = [];
    sequence = 0;

    const graphqlService = {
      query: vi.fn(),
      mutation: vi.fn(async (document: unknown, variables: Variables) => {
        const op = operationOf(document);

        writes.push({ op, variables });

        const respond = overrides.get(op) ?? defaults[op];

        if (respond === undefined) throw new Error(`Unexpected mutation ${op}`);

        return respond(variables);
      }),
    } as unknown as GraphqlService;

    publicationService = {
      createPublication: vi.fn(async (publication: { isbn: string }, workId: string) => {
        writes.push({ op: 'CreatePublication', variables: { workId, isbn: publication.isbn, path: 'ordinary' } });

        return { ...publication, id: `publication-${next()}` };
      }),
      createImportPublication: vi.fn(
        async (publication: { isbn: string }, workId: string, onCreated?: (id: string) => void) => {
          const variables = { workId, isbn: publication.isbn } as unknown as Variables;

          writes.push({ op: 'CreatePublication', variables });

          const respond = overrides.get('CreatePublication');

          if (respond !== undefined) return respond({ ...variables, onCreated } as unknown as Variables);

          const id = `publication-${next()}`;

          onCreated?.(id);

          return { ...publication, id };
        },
      ),
      deletePublication: vi.fn(async (publicationId: string) => {
        writes.push({ op: 'DeletePublication', variables: { publicationId } });

        const respond = overrides.get('DeletePublication');

        return respond === undefined ? { publicationId } : respond({ publicationId } as unknown as Variables);
      }),
    } as unknown as PublicationService;

    seriesService = {
      createSeries: vi.fn(async (data: { name: string }) => {
        writes.push({ op: 'CreateSeries', variables: { name: data.name } });

        return { ...data, id: `series-${next()}` };
      }),
      createIssue: vi.fn(async (issue: Record<string, unknown>) => {
        writes.push({ op: 'CreateIssue', variables: issue });

        const respond = overrides.get('CreateIssue');

        return respond === undefined ? {} : respond(issue as Variables);
      }),
    } as unknown as SeriesService;

    contributorService = {
      createContributor: vi.fn(async (data: { fullName: string }) => {
        writes.push({ op: 'CreateContributor', variables: { fullName: data.fullName } });

        return { id: `contributor-${next()}` };
      }),
    } as unknown as ContributorService;

    mapper = new WorkDtoMapper();
    // The backend's own echo of a created Work is its id: nothing else is read back from it.
    vi.spyOn(mapper, 'toEntity').mockImplementation((dto: WorkDto) => getDefaultWork({ id: dto?.workId }));

    service = new WorkService({
      graphqlService,
      fundingService: {} as unknown as FundingService,
      subjectService: {} as unknown as SubjectService,
      contributionService: new ContributionService({
        graphqlService,
        contributorService,
        affiliationService: { createAffiliation: vi.fn() } as unknown as AffiliationService,
      }),
      publicationService,
      languageService: {} as unknown as LanguageService,
      seriesService,
      referenceService: {} as unknown as ReferenceService,
      titleService: { createTitles: vi.fn().mockResolvedValue([]) } as unknown as TitleService,
      abstractService: {} as unknown as AbstractService,
      mapper,
    });
  });

  describe('Publications', () => {
    it('attaches a Publication to an exact existing Work in a plan that creates no Work at all', async () => {
      await run(onixPlan({ units: [unit(1, existing('w-existing'), [attach('w-existing', '9781800640000')])] }));

      expect(writes).toEqual([{ op: 'CreatePublication', variables: { workId: 'w-existing', isbn: '9781800640000' } }]);
      expect(progress).toEqual([
        {
          total: 1,
          completed: 0,
          current: { position: 1, title: 'Unit 1', chapterCount: 0, unit: 'EXISTING_WORK' },
          stage: 'publication',
        },
      ]);
    });

    it('creates a new Work’s one Publication exactly once, through its own stage, under the id the Work was created with', async () => {
      const plan = onixPlan({
        works: [work('w1', { publications: [getDefaultPublication({ isbn: '9781800640001' })] })],
        units: [unit(1, planned('w1'), [createWork('w1'), createPublication('w1', 0)])],
      });

      await run(plan);

      expect(ops()).toEqual(['CreateWork', 'CreatePublication']);
      expect(writesOf('CreatePublication')).toEqual([{ workId: 'db-w1', isbn: '9781800640001' }]);
      expect(publicationService.createPublication).not.toHaveBeenCalled();
    });

    it('creates N Publications as N publication actions after one CREATE_WORK, and none inside the work stage', async () => {
      const isbns = ['9781800640001', '9781800640002', '9781800640003'];
      const plan = onixPlan({
        works: [work('w1', { publications: isbns.map((isbn) => getDefaultPublication({ isbn })) })],
        units: [
          unit(1, planned('w1'), [createWork('w1'), ...isbns.map((_isbn, index) => createPublication('w1', index))]),
        ],
      });
      const stageOfWrite: string[] = [];

      vi.mocked(publicationService.createImportPublication).mockImplementation(
        async (publication, _workId, onCreated) => {
          stageOfWrite.push(progress.at(-1)?.stage ?? 'none');
          onCreated?.(`publication-${publication.isbn}`);

          return publication;
        },
      );

      await run(plan);

      expect(writesOf('CreateWork')).toHaveLength(1);
      expect(
        vi.mocked(publicationService.createImportPublication).mock.calls.map(([{ isbn }, workId]) => [isbn, workId]),
      ).toEqual(isbns.map((isbn) => [isbn, 'db-w1']));
      expect(stageOfWrite).toEqual(['publication', 'publication', 'publication']);
      expect(publicationService.createPublication).not.toHaveBeenCalled();
      expect(stages()).toEqual(['1:work', '1:publication']);
    });

    it('hands each Publication its exact confirmed payload, Locations and Prices in their confirmed order', async () => {
      const publication = getDefaultPublication({
        isbn: '9781800640001',
        prices: [
          { id: '', currencyCode: CurrencyCode.enum.Usd, unitPrice: 12 },
          { id: '', currencyCode: CurrencyCode.enum.Gbp, unitPrice: 10 },
        ],
        locations: [
          {
            id: '',
            canonical: false,
            fullTextUrl: 'https://b',
            landingPage: 'https://b',
            locationPlatform: LocationPlatforms.enum.Other,
          },
          {
            id: '',
            canonical: true,
            fullTextUrl: 'https://a',
            landingPage: 'https://a',
            locationPlatform: LocationPlatforms.enum.Other,
          },
        ],
      });
      const plan = onixPlan({
        works: [work('w1', { publications: [publication] })],
        units: [unit(1, planned('w1'), [createWork('w1'), createPublication('w1', 0)])],
      });

      await run(plan);

      expect(vi.mocked(publicationService.createImportPublication).mock.calls[0][0]).toBe(publication);
    });

    it('refuses before any mutation a Publication holding two canonical Locations', async () => {
      const location = {
        id: '',
        canonical: true,
        fullTextUrl: 'https://a',
        landingPage: '',
        locationPlatform: LocationPlatforms.enum.Other,
      };
      const error = await failure(
        onixPlan({
          works: [work('w1', { publications: [getDefaultPublication({ locations: [location, { ...location }] })] })],
          units: [unit(1, planned('w1'), [createWork('w1'), createPublication('w1', 0)])],
        }),
      );

      expect(writes).toEqual([]);
      expect(error.message).toContain('more than one canonical Location');
      expect(error.context.cleanup).toEqual({ status: 'NOT_REQUIRED', retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT' });
    });

    it('keeps ordinary Work creation exactly as before: it creates every Publication the Work holds itself', async () => {
      const created = await service.createWork(
        work('w1', {
          publications: [
            getDefaultPublication({ isbn: '9781800640001' }),
            getDefaultPublication({ isbn: '9781800640002' }),
          ],
        }),
      );

      expect(writes.filter(({ op }) => op === 'CreatePublication')).toEqual([
        { op: 'CreatePublication', variables: { workId: 'db-w1', isbn: '9781800640001', path: 'ordinary' } },
        { op: 'CreatePublication', variables: { workId: 'db-w1', isbn: '9781800640002', path: 'ordinary' } },
      ]);
      expect(created.publications).toHaveLength(2);
      expect(publicationService.createImportPublication).not.toHaveBeenCalled();
    });

    it('never changes the confirmed plan: the Work payload keeps every Publication it was confirmed with', async () => {
      const plan = onixPlan({
        works: [
          work('w1', { publications: [getDefaultPublication({ isbn: '9781800640001' })] }),
          work('w2', { publications: [getDefaultPublication({ isbn: '9781800640002' })] }),
        ],
        chapters: [work('c1', { relationId: 'w1' })],
        units: [
          unit(1, planned('w1'), [
            createWork('w1'),
            createPublication('w1', 0),
            createChild('CREATE_CHAPTER', 'c1', 'w1', 1),
          ]),
          unit(2, planned('w2'), [createWork('w2'), createPublication('w2', 0)]),
        ],
      });
      const before = structuredClone(plan);

      await run(plan);

      expect(plan).toEqual(before);
      expect(plan.works.map(({ publications }) => publications.length)).toEqual([1, 1]);
    });
  });

  describe('chapters, contained Works and relations', () => {
    it('creates each chapter, then its exact IS_CHILD_OF relation at the planned ordinal, never a counted one', async () => {
      await run(
        onixPlan({
          works: [work('w1')],
          chapters: [work('c1', { relationId: 'w1' }), work('c2', { relationId: 'w1' })],
          units: [
            unit(1, planned('w1'), [
              createWork('w1'),
              createChild('CREATE_CHAPTER', 'c1', 'w1', 3),
              createChild('CREATE_CHAPTER', 'c2', 'w1', 7),
            ]),
          ],
        }),
      );

      expect(ops()).toEqual(['CreateWork', 'CreateWork', 'CreateWorkRelation', 'CreateWork', 'CreateWorkRelation']);
      expect(writesOf('CreateWorkRelation')).toEqual([
        { data: { relatorWorkId: 'db-c1', relatedWorkId: 'db-w1', relationOrdinal: 3, relationType: 'IS_CHILD_OF' } },
        { data: { relatorWorkId: 'db-c2', relatedWorkId: 'db-w1', relationOrdinal: 7, relationType: 'IS_CHILD_OF' } },
      ]);
      expect(progress.map(({ current }) => current.chapterCount)).toEqual([2, 2]);
    });

    it('creates a contained Work, then its exact IS_PART_OF relation at the planned ordinal, with its own contributor intents', async () => {
      const editor = getDefaultContribution({
        contributorId: appConfig.defaultId,
        fullName: 'Jane Doe',
        lastName: 'Doe',
        orcidId: '',
        type: ContributorTypes.enum.Editor,
        orderNumber: 1,
      });
      const translator = { ...editor, type: ContributorTypes.enum.Translator, orderNumber: 2 };

      await run(
        onixPlan({
          works: [work('w1')],
          containedWorks: [work('cw1', { relationId: 'w1', contributions: [editor, translator] })],
          contributorIntents: [{ workId: 'cw1', key: 'intent-contained', ordinals: [1, 2] }],
          units: [unit(1, planned('w1'), [createWork('w1'), createChild('CREATE_CONTAINED_WORK', 'cw1', 'w1', 2)])],
        }),
      );

      expect(writesOf('CreateWorkRelation')).toEqual([
        { data: { relatorWorkId: 'db-cw1', relatedWorkId: 'db-w1', relationOrdinal: 2, relationType: 'IS_PART_OF' } },
      ]);
      // One source contributor with two roles on the contained Work: one contributor, both contributions.
      expect(writesOf('CreateContributor')).toHaveLength(1);
      expect(writesOf('CreateContribution').map(({ data }) => (data as { workId: string }).workId)).toEqual([
        'db-cw1',
        'db-cw1',
      ]);
      expect(stages()).toEqual(['1:work', '1:containedWork']);
    });

    it('creates a cross-Work relation once, in the unit the plan gave it, between the ids both Works were created with', async () => {
      await run(
        onixPlan({
          works: [work('w1'), work('w2')],
          relations: [edge('EDGE|1', planned('w1'), planned('w2'), 4)],
          units: [
            unit(1, planned('w1'), [createWork('w1')]),
            unit(2, planned('w2'), [createWork('w2'), relate('EDGE|1')]),
          ],
        }),
      );

      expect(ops()).toEqual(['CreateWork', 'CreateWork', 'CreateWorkRelation']);
      expect(writesOf('CreateWorkRelation')).toEqual([
        {
          data: { relatorWorkId: 'db-w1', relatedWorkId: 'db-w2', relationOrdinal: 4, relationType: 'HAS_TRANSLATION' },
        },
      ]);
      expect(stages()).toEqual(['1:work', '2:work', '2:relation']);
    });

    it('creates no mutation for a relation Thoth already holds', async () => {
      await run(
        onixPlan({
          works: [work('w1')],
          relations: [{ ...edge('EDGE|1', planned('w1'), existing('w-t')), status: 'SATISFIED' }],
          units: [unit(1, planned('w1'), [createWork('w1')])],
        }),
      );

      expect(ops()).toEqual(['CreateWork']);
    });

    it('refuses before any mutation a relation whose unit runs before a Work it names is created', async () => {
      const error = await failure(
        onixPlan({
          works: [work('w1'), work('w2')],
          relations: [edge('EDGE|1', planned('w1'), planned('w2'))],
          units: [
            unit(1, planned('w1'), [createWork('w1'), relate('EDGE|1')]),
            unit(2, planned('w2'), [createWork('w2')]),
          ],
        }),
      );

      expect(writes).toEqual([]);
      expect(error.message).toContain('names a Work no earlier action of the plan creates');
      expect(error.context).toMatchObject({
        total: 2,
        completed: 0,
        stage: 'relation',
        cleanup: { status: 'NOT_REQUIRED', retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT' },
      });
    });

    it('refuses before any mutation a planned relation no unit creates: nothing is silently left out', async () => {
      const error = await failure(
        onixPlan({
          works: [work('w1')],
          relations: [edge('EDGE|1', planned('w1'), existing('w-t'))],
          units: [unit(1, planned('w1'), [createWork('w1')])],
        }),
      );

      expect(writes).toEqual([]);
      expect(error.message).toContain('no execution unit creates the planned relation EDGE|1');
    });

    it('refuses before any mutation a Publication, chapter or Series membership no unit creates', async () => {
      const unplanned = [
        onixPlan({
          works: [work('w1', { publications: [getDefaultPublication()] })],
          units: [unit(1, planned('w1'), [createWork('w1')])],
        }),
        onixPlan({
          works: [work('w1')],
          chapters: [work('c1', { relationId: 'w1' })],
          units: [unit(1, planned('w1'), [createWork('w1')])],
        }),
        onixPlan({
          works: [work('w1')],
          series: [
            { name: 'S', target: { kind: 'existing', seriesId: 's-1' }, members: [{ workId: 'w1', orderNumber: 1 }] },
          ],
          units: [unit(1, planned('w1'), [createWork('w1')])],
        }),
      ];

      for (const plan of unplanned) {
        await expect(run(plan)).rejects.toThrow(/no execution unit creates/);
      }

      expect(writes).toEqual([]);
    });

    it('refuses before any mutation a unit whose actions are out of stage order, or an action planned twice', async () => {
      await expect(
        run(
          onixPlan({
            works: [work('w1')],
            units: [
              unit(1, planned('w1'), [
                createWork('w1'),
                createAward(planned('w1'), 'A', 1),
                createResource(planned('w1'), 'R', 1),
              ]),
            ],
          }),
        ),
      ).rejects.toThrow('out of stage order');
      await expect(
        run(
          onixPlan({
            works: [work('w1')],
            units: [
              unit(1, planned('w1'), [
                createWork('w1'),
                createAward(planned('w1'), 'A', 1),
                createAward(planned('w1'), 'A', 1),
              ]),
            ],
          }),
        ),
      ).rejects.toThrow('planned twice');
      expect(writes).toEqual([]);
    });
  });

  describe('collateral, reviews, endorsements and awards', () => {
    it('creates every formerly deferred family under its Work, in stage order, with its exact ordinal and markup format', async () => {
      await run(
        onixPlan({
          works: [work('w1')],
          units: [
            unit(1, planned('w1'), [
              createWork('w1'),
              createResource(planned('w1'), 'trailer', 2, MarkupFormat.PlainText),
              createReview(planned('w1'), '<p>A fine book.</p>', 1, MarkupFormat.Html),
              createEndorsement(planned('w1'), 'Essential.', 3, MarkupFormat.PlainText),
              createAward(planned('w1'), 'The Prize', 1, MarkupFormat.JatsXml),
            ]),
          ],
        }),
      );

      expect(ops()).toEqual([
        'CreateWork',
        'CreateAdditionalResource',
        'CreateBookReview',
        'CreateEndorsement',
        'CreateAward',
      ]);
      expect(writesOf('CreateAdditionalResource')).toEqual([
        {
          data: expect.objectContaining({
            workId: 'db-w1',
            title: 'trailer',
            description: 'About trailer',
            resourceType: 'VIDEO',
            url: 'https://example.org/trailer',
            resourceOrdinal: 2,
          }),
          markupFormat: 'PLAIN_TEXT',
        },
      ]);
      expect(writesOf('CreateBookReview')).toEqual([
        {
          data: expect.objectContaining({ workId: 'db-w1', text: '<p>A fine book.</p>', reviewOrdinal: 1 }),
          markupFormat: 'HTML',
        },
      ]);
      expect(writesOf('CreateEndorsement')).toEqual([
        {
          data: expect.objectContaining({ workId: 'db-w1', authorName: 'An Endorser', endorsementOrdinal: 3 }),
          markupFormat: 'PLAIN_TEXT',
        },
      ]);
      expect(writesOf('CreateAward')).toEqual([
        {
          data: expect.objectContaining({ workId: 'db-w1', title: 'The Prize', awardOrdinal: 1, role: 'WINNER' }),
          markupFormat: 'JATS_XML',
        },
      ]);
      expect(stages()).toEqual(['1:work', '1:additionalResource', '1:bookReview', '1:endorsement', '1:award']);
    });

    it('writes each planned Work’s stated counts into its CREATE_WORK, zero included', async () => {
      await run(
        onixPlan({
          works: [work('w1'), work('w2')],
          statedCounts: [{ workId: 'w1', counts: { tableCount: 0, imageCount: 12 } }],
          units: [unit(1, planned('w1'), [createWork('w1')]), unit(2, planned('w2'), [createWork('w2')])],
        }),
      );

      const [first, second] = writesOf('CreateWork').map(({ data }) => data as Record<string, unknown>);

      expect(first).toMatchObject({ tableCount: 0, imageCount: 12 });
      expect(second).toMatchObject({ tableCount: null, imageCount: null });
    });
  });

  describe('progress', () => {
    it('reports a unit with nothing to do as a NOOP, sends nothing for it, and counts it completed', async () => {
      await run(
        onixPlan({
          works: [work('w2')],
          units: [unit(1, existing('w-held'), [], 'Held already'), unit(2, planned('w2'), [createWork('w2')])],
        }),
      );

      expect(progress).toEqual([
        {
          total: 2,
          completed: 0,
          current: { position: 1, title: 'Held already', chapterCount: 0, unit: 'NOOP' },
          stage: 'noop',
        },
        {
          total: 2,
          completed: 1,
          current: { position: 2, title: 'Unit 2', chapterCount: 0, unit: 'NEW_WORK' },
          stage: 'work',
        },
      ]);
      expect(ops()).toEqual(['CreateWork']);
    });

    it('stops on the failed unit: earlier units stay completed and untouched, later ones never start', async () => {
      overrides.set('CreateWork', ({ data }) => {
        const { reference } = data as { reference: string };

        if (reference === 'w2') throw new Error('Work refused');

        return { createWork: { workId: `db-${reference}` } };
      });

      const error = await failure(
        onixPlan({
          works: [work('w1'), work('w2'), work('w3')],
          units: [
            unit(1, planned('w1'), [createWork('w1')]),
            unit(2, planned('w2'), [createWork('w2')]),
            unit(3, planned('w3'), [createWork('w3')]),
          ],
        }),
      );

      expect(error.message).toBe('Work refused');
      expect(error.context).toMatchObject({ total: 3, completed: 1, current: { position: 2 }, stage: 'work' });
      expect(writesOf('CreateWork').map(({ data }) => (data as { reference: string }).reference)).toEqual(['w1', 'w2']);
      expect(writesOf('DeleteWork')).toEqual([]);
    });
  });

  describe('compensation', () => {
    it('deletes every Work the failed unit created in reverse order, its top-level Work last, and proves each', async () => {
      fail('CreateAdditionalResource');

      const error = await failure(
        onixPlan({
          works: [work('w0'), work('w1')],
          chapters: [work('c1', { relationId: 'w1' }), work('c2', { relationId: 'w1' })],
          containedWorks: [work('cw1', { relationId: 'w1' })],
          units: [
            unit(1, planned('w0'), [createWork('w0')]),
            unit(2, planned('w1'), [
              createWork('w1'),
              createChild('CREATE_CHAPTER', 'c1', 'w1', 1),
              createChild('CREATE_CHAPTER', 'c2', 'w1', 2),
              createChild('CREATE_CONTAINED_WORK', 'cw1', 'w1', 1),
              createResource(planned('w1'), 'trailer', 1),
            ]),
          ],
        }),
      );

      expect(error.message).toBe('CreateAdditionalResource refused');
      expect(writesOf('DeleteWork')).toEqual([
        { workId: 'db-cw1' },
        { workId: 'db-c2' },
        { workId: 'db-c1' },
        { workId: 'db-w1' },
      ]);
      expect(error.context).toMatchObject({ completed: 1, current: { position: 2 }, stage: 'additionalResource' });
      expect(error.context.cleanup).toEqual({
        status: 'VERIFIED',
        retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT',
        compensated: [
          {
            operation: 'DELETE_WORK',
            entityId: 'db-cw1',
            actionKey: 'w1|CREATE_CONTAINED_WORK|cw1',
            stage: 'containedWork',
          },
          { operation: 'DELETE_WORK', entityId: 'db-c2', actionKey: 'w1|CREATE_CHAPTER|c2', stage: 'chapter' },
          { operation: 'DELETE_WORK', entityId: 'db-c1', actionKey: 'w1|CREATE_CHAPTER|c1', stage: 'chapter' },
          { operation: 'DELETE_WORK', entityId: 'db-w1', actionKey: 'w1|WORK', stage: 'work' },
        ],
      });
    });

    it('never claims a safe retry when a chapter’s relation failed and the chapter’s own delete is not proven', async () => {
      fail('CreateWorkRelation');
      overrides.set('DeleteWork', ({ workId }) => {
        if (workId === 'db-c1') throw new Error('Delete timed out');

        return { deleteWork: { workId } };
      });

      const error = await failure(
        onixPlan({
          works: [work('w1')],
          chapters: [work('c1', { relationId: 'w1' })],
          units: [unit(1, planned('w1'), [createWork('w1'), createChild('CREATE_CHAPTER', 'c1', 'w1', 1)])],
        }),
      );

      expect(error.message).toBe('CreateWorkRelation refused');
      expect(error.context.stage).toBe('chapter');
      expect(writesOf('DeleteWork')).toEqual([{ workId: 'db-c1' }, { workId: 'db-w1' }]);
      expect(error.context.cleanup).toEqual({
        status: 'FAILED_OR_UNKNOWN',
        retry: 'MANUAL_RECONCILIATION_REQUIRED',
        compensated: [{ operation: 'DELETE_WORK', entityId: 'db-w1', actionKey: 'w1|WORK', stage: 'work' }],
        failures: [
          {
            operation: 'DELETE_WORK',
            entityId: 'db-c1',
            actionKey: 'w1|CREATE_CHAPTER|c1',
            stage: 'chapter',
            reason: 'Delete timed out',
          },
        ],
      });
    });

    it('counts a delete that returns another id, or none, as unproven', async () => {
      fail('CreateAward');
      overrides.set('DeleteWork', () => ({ deleteWork: { workId: 'someone-else' } }));

      const mismatched = await failure(
        onixPlan({
          works: [work('w1')],
          units: [unit(1, planned('w1'), [createWork('w1'), createAward(planned('w1'), 'The Prize', 1)])],
        }),
      );

      expect(mismatched.context.cleanup).toMatchObject({
        status: 'FAILED_OR_UNKNOWN',
        failures: [expect.objectContaining({ entityId: 'db-w1', reason: expect.stringContaining('someone-else') })],
      });

      overrides.set('DeleteWork', () => ({ deleteWork: null }));

      const empty = await failure(
        onixPlan({
          works: [work('w1')],
          units: [unit(1, planned('w1'), [createWork('w1'), createAward(planned('w1'), 'The Prize', 1)])],
        }),
      );

      expect(empty.context.cleanup).toMatchObject({
        status: 'FAILED_OR_UNKNOWN',
        failures: [expect.objectContaining({ entityId: 'db-w1', reason: 'The delete returned no id' })],
      });
    });

    it('never deletes an existing Work: it removes only what this attempt created under it, by the exact ids returned', async () => {
      fail('CreateAward', 'Award refused');

      const error = await failure(
        onixPlan({
          works: [work('w1')],
          relations: [edge('EDGE|1', existing('w-existing'), existing('w-other'), 2)],
          units: [
            unit(1, existing('w-existing'), [attach('w-existing', '9781800640009')]),
            unit(2, existing('w-existing-2'), [
              attach('w-existing-2', '9781800640010'),
              createResource(existing('w-existing-2'), 'trailer', 1),
              createReview(existing('w-existing-2'), 'Fine.', 1),
              createEndorsement(existing('w-existing-2'), 'Essential.', 1),
              createAward(existing('w-existing-2'), 'The Prize', 1),
              relate('EDGE|1'),
            ]),
            unit(3, planned('w1'), [createWork('w1')]),
          ],
        }),
      );

      expect(error.message).toBe('Award refused');
      expect(writesOf('DeleteWork')).toEqual([]);
      // Unit 1's Publication stays: it was completed before the failed unit started.
      expect(writes.filter(({ op }) => op.startsWith('Delete'))).toEqual([
        { op: 'DeleteEndorsement', variables: { endorsementId: 'endorsement-5' } },
        { op: 'DeleteBookReview', variables: { bookReviewId: 'review-4' } },
        { op: 'DeleteAdditionalResource', variables: { additionalResourceId: 'resource-3' } },
        { op: 'DeletePublication', variables: { publicationId: 'publication-2' } },
      ]);
      // Every write it holds an id for is proven gone; the refused Award's own request left no id, so nothing proves it
      // absent, and the existing Work must be reconciled by hand before the file is tried again.
      expect(error.context.cleanup).toEqual({
        status: 'FAILED_OR_UNKNOWN',
        retry: 'MANUAL_RECONCILIATION_REQUIRED',
        compensated: [
          expect.objectContaining({ operation: 'DELETE_ENDORSEMENT', entityId: 'endorsement-5', stage: 'endorsement' }),
          expect.objectContaining({ operation: 'DELETE_BOOK_REVIEW', entityId: 'review-4', stage: 'bookReview' }),
          expect.objectContaining({
            operation: 'DELETE_ADDITIONAL_RESOURCE',
            entityId: 'resource-3',
            stage: 'additionalResource',
          }),
          expect.objectContaining({ operation: 'DELETE_PUBLICATION', entityId: 'publication-2', stage: 'publication' }),
        ],
        failures: [
          {
            operation: 'CREATE_OUTCOME_UNKNOWN',
            entityId: null,
            actionKey: 'w-existing-2|AWARD|1',
            stage: 'award',
            reason: 'The creation request failed without returning an id',
          },
        ],
      });
      expect(writesOf('CreateWork')).toEqual([]);
    });

    it('deletes the relations a failed unit created between Works it did not create, by the exact ids returned', async () => {
      let relations = 0;

      overrides.set('CreateWorkRelation', () => {
        relations += 1;

        if (relations === 3) throw new Error('Relation refused');

        return { createWorkRelation: { workRelationId: `relation-${relations}` } };
      });

      const error = await failure(
        onixPlan({
          works: [work('w1')],
          relations: [
            edge('EDGE|1', planned('w1'), existing('w-t')),
            edge('EDGE|2', existing('w-t'), existing('w-u')),
            edge('EDGE|3', existing('w-t'), existing('w-v')),
          ],
          units: [
            unit(1, planned('w1'), [createWork('w1')]),
            unit(2, existing('w-t'), [
              createReview(existing('w-t'), 'Fine.', 1),
              relate('EDGE|1'),
              relate('EDGE|2'),
              relate('EDGE|3'),
            ]),
          ],
        }),
      );

      expect(error.message).toBe('Relation refused');
      expect(error.context).toMatchObject({ completed: 1, stage: 'relation' });
      // The Work unit 1 created stays: only unit 2's own writes are removed, newest first.
      expect(writes.filter(({ op }) => op.startsWith('Delete'))).toEqual([
        { op: 'DeleteWorkRelation', variables: { workRelationId: 'relation-2' } },
        { op: 'DeleteWorkRelation', variables: { workRelationId: 'relation-1' } },
        { op: 'DeleteBookReview', variables: { bookReviewId: 'review-1' } },
      ]);
      expect(error.context.cleanup).toMatchObject({
        status: 'FAILED_OR_UNKNOWN',
        retry: 'MANUAL_RECONCILIATION_REQUIRED',
        compensated: [
          expect.objectContaining({ operation: 'DELETE_WORK_RELATION', entityId: 'relation-2' }),
          expect.objectContaining({ operation: 'DELETE_WORK_RELATION', entityId: 'relation-1' }),
          expect.objectContaining({ operation: 'DELETE_BOOK_REVIEW', entityId: 'review-1' }),
        ],
        // The refused relation's own request may have reached the backend: nothing proves it absent.
        failures: [expect.objectContaining({ operation: 'CREATE_OUTCOME_UNKNOWN', actionKey: 'RELATION|EDGE|3' })],
      });
    });

    it('removes a relation naming a Work the failed unit created together with that Work, never on its own', async () => {
      fail('CreateWorkRelation');

      const error = await failure(
        onixPlan({
          works: [work('w1'), work('w2')],
          relations: [edge('EDGE|1', planned('w1'), planned('w2'))],
          units: [
            unit(1, planned('w1'), [createWork('w1')]),
            unit(2, planned('w2'), [createWork('w2'), relate('EDGE|1')]),
          ],
        }),
      );

      // Deleting the unit's own Work removes the relation's request with it, whatever became of it.
      expect(writes.filter(({ op }) => op.startsWith('Delete'))).toEqual([
        { op: 'DeleteWork', variables: { workId: 'db-w2' } },
      ]);
      expect(error.context.cleanup).toMatchObject({ status: 'VERIFIED' });
    });

    it('treats a Work creation whose result is unknown as unproven, never as nothing to clean', async () => {
      fail('CreateWork', 'Network error: connection reset');

      const error = await failure(
        onixPlan({ works: [work('w1')], units: [unit(1, planned('w1'), [createWork('w1')])] }),
      );

      expect(error.message).toBe('Network error: connection reset');
      expect(error.context.cleanup).toEqual({
        status: 'FAILED_OR_UNKNOWN',
        retry: 'MANUAL_RECONCILIATION_REQUIRED',
        compensated: [],
        failures: [
          {
            operation: 'CREATE_OUTCOME_UNKNOWN',
            entityId: null,
            actionKey: 'w1|WORK',
            stage: 'work',
            reason: 'The Work creation request failed without returning a Work id',
          },
        ],
      });
    });

    it('treats a create under an existing Work that returned no id as unknown, and an attached Publication with no id too', async () => {
      overrides.set('CreateAdditionalResource', () => ({ createAdditionalResource: null }));

      const resource = await failure(
        onixPlan({ units: [unit(1, existing('w-e'), [createResource(existing('w-e'), 'trailer', 1)])] }),
      );

      expect(resource.context.cleanup).toMatchObject({
        status: 'FAILED_OR_UNKNOWN',
        failures: [expect.objectContaining({ operation: 'CREATE_OUTCOME_UNKNOWN', stage: 'additionalResource' })],
      });

      overrides.set('CreatePublication', () => {
        throw new Error('Publication request lost');
      });

      const publication = await failure(
        onixPlan({ units: [unit(1, existing('w-e'), [attach('w-e', '9781800640012')])] }),
      );

      expect(publication.message).toBe('Publication request lost');
      expect(publication.context.cleanup).toMatchObject({
        status: 'FAILED_OR_UNKNOWN',
        failures: [expect.objectContaining({ operation: 'CREATE_OUTCOME_UNKNOWN', stage: 'publication' })],
      });
      expect(writesOf('DeleteWork')).toEqual([]);
    });

    it('deletes an attached Publication whose Price failed after it was created, and proves it', async () => {
      overrides.set('CreatePublication', ({ onCreated }) => {
        (onCreated as unknown as (id: string) => void)('publication-attached');

        throw new Error('Price refused');
      });

      const error = await failure(onixPlan({ units: [unit(1, existing('w-e'), [attach('w-e', '9781800640013')])] }));

      expect(error.message).toBe('Price refused');
      expect(writesOf('DeletePublication')).toEqual([{ publicationId: 'publication-attached' }]);
      expect(error.context.cleanup).toEqual({
        status: 'VERIFIED',
        retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT',
        compensated: [
          {
            operation: 'DELETE_PUBLICATION',
            entityId: 'publication-attached',
            actionKey: 'w-e|PUBLICATION|9781800640013',
            stage: 'publication',
          },
        ],
      });
    });

    it('leaves a Contributor the failed unit created as accepted residue, and still proves its cleanup', async () => {
      fail('CreateEndorsement');

      const error = await failure(
        onixPlan({
          works: [
            work('w1', {
              contributions: [
                getDefaultContribution({ contributorId: appConfig.defaultId, fullName: 'Jane Doe', orcidId: '' }),
              ],
            }),
          ],
          units: [unit(1, planned('w1'), [createWork('w1'), createEndorsement(planned('w1'), 'Essential.', 1)])],
        }),
      );

      // The Contributor is never a cleanup target: no mutation of any kind touches it again.
      expect(writesOf('CreateContributor')).toHaveLength(1);
      expect(ops().filter((op) => op.includes('Contributor') && op !== 'CreateContributor')).toEqual([]);
      expect(error.context.cleanup).toMatchObject({
        status: 'VERIFIED',
        compensated: [expect.objectContaining({ entityId: 'db-w1' })],
      });
    });

    it('creates a new Series once, reuses it for a later unit, and keeps it as residue when that unit fails', async () => {
      const series: SeriesImportPlan = [
        {
          name: 'Arc Companions',
          target: {
            kind: 'proposed',
            series: { name: 'Arc Companions', imprintId: 'i-1', type: SeriesTypes.enum.BookSeries },
          },
          members: [
            { workId: 'w1', orderNumber: 1 },
            { workId: 'w2', orderNumber: 2 },
          ],
        },
      ];
      const issue = (workId: string, member: number): ImportExecutionAction => ({
        kind: 'CREATE_SERIES_ISSUE',
        actionKey: `${workId}|SERIES|0|${member}`,
        work: planned(workId),
        membership: { group: 0, member },
      });

      overrides.set('CreateIssue', ({ workId }) => {
        if (workId === 'db-w2') throw new Error('Issue refused');

        return {};
      });

      const error = await failure(
        onixPlan({
          works: [work('w1'), work('w2')],
          series,
          units: [
            unit(1, planned('w1'), [createWork('w1'), issue('w1', 0)]),
            unit(2, planned('w2'), [createWork('w2'), issue('w2', 1)]),
          ],
        }),
      );

      expect(writesOf('CreateSeries')).toHaveLength(1);
      expect(
        writesOf('CreateIssue').map(({ seriesId, workId, orderNumber }) => [seriesId, workId, orderNumber]),
      ).toEqual([
        ['series-1', 'db-w1', 1],
        ['series-1', 'db-w2', 2],
      ]);
      expect(error.context.stage).toBe('series');
      expect(writesOf('DeleteWork')).toEqual([{ workId: 'db-w2' }]);
      expect(error.context.cleanup).toMatchObject({ status: 'VERIFIED' });
    });

    it('keeps the original error as the failure when every cleanup delete fails too', async () => {
      fail('CreateBookReview', 'Review refused');
      fail('DeleteWork', 'Delete refused');

      const error = await failure(
        onixPlan({
          works: [work('w1')],
          units: [unit(1, planned('w1'), [createWork('w1'), createReview(planned('w1'), 'Fine.', 1)])],
        }),
      );

      expect(error.message).toBe('Review refused');
      expect(error.context.stage).toBe('bookReview');
      expect(error.context.cleanup).toMatchObject({
        status: 'FAILED_OR_UNKNOWN',
        retry: 'MANUAL_RECONCILIATION_REQUIRED',
        failures: [expect.objectContaining({ operation: 'DELETE_WORK', entityId: 'db-w1', reason: 'Delete refused' })],
      });
    });

    it('refuses a plan with no execution units before any mutation, with nothing to clean', async () => {
      const error = await failure({ ...onixPlan({ works: [work('w1')], units: [] }), execution: undefined });

      expect(writes).toEqual([]);
      expect(error.context.cleanup).toEqual({ status: 'NOT_REQUIRED', retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT' });
    });
  });
});
