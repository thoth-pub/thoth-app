import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';
import { SubjectTypes } from '@/src/shared/constants';
import { getDefaultContribution } from '@/src/shared/constants/contributions';
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
