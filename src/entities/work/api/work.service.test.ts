import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';
import { SubjectTypes } from '@/src/shared/constants';
import { getDefaultContribution } from '@/src/shared/constants/contributions';
import { SeriesType as SeriesTypes } from '@/src/shared/constants/series';
import type { ImportPlan, ProposedSeries, SeriesImportPlan } from '@/src/shared/types';
import { getDefaultFunding } from '@/src/shared/utils/fundings';
import { getDefaultPublication } from '@/src/shared/utils/publications';
import { getDefaultAbstract, getDefaultTitle, getDefaultWork } from '@/src/shared/utils/work';

import { AbstractService } from '../../abstract/api/abstract.service';
import { ContributionService } from '../../contribution/api/contribution.service';
import { FundingService } from '../../funding/api/funding.service';
import { LanguageService } from '../../language/api/language.service';
import { PublicationService } from '../../publication/api/publication.service';
import { ReferenceService } from '../../reference/api/reference.service';
import { SeriesService } from '../../series';
import { SubjectService } from '../../subject/api/subject.service';
import { TitleService } from '../../title/api/title.service';
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

  it('should rollback (delete work) when title creation fails', async () => {
    const title = getDefaultTitle({ id: faker.string.uuid(), title: 'Failing' });
    const workEntity = getDefaultWork({ id: faker.string.uuid(), titles: [title] });
    const createdId = faker.string.uuid();
    const errorMessage = 'Title creation failed';

    (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
      createWork: mockWorkDto(createdId, workEntity),
    });

    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

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

    (mockTitleService.createTitles as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(titleErrorMessage));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const promise = workService.createWork(workEntity);

    await expect(promise).rejects.toThrow(titleErrorMessage);
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

  it('leaves works with no planned series untouched', async () => {
    await workService.bulkCreateWorks(planOf([getDefaultWork({ id: 'w1' })]));

    expect(mockSeriesService.createSeries).not.toHaveBeenCalled();
    expect(mockSeriesService.createIssue).not.toHaveBeenCalled();
  });
});
