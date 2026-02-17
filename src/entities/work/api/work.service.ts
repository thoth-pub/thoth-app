import { Direction, RelationType, WorkField, WorkStatus, WorkType } from '@/gql/graphql';
import {
  AbstractDto,
  AbstractEntity,
  appConfig,
  FileStorage,
  getDateInFuture,
  isTextContainsAnyMarkdownTag,
  QueryToken,
  SeriesForUpdateItems,
  TitleDto,
  TitleEntity,
  WorkStatuses,
} from '@/src/shared';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { BaseService } from '@/src/shared/interfaces/services';

import { ContributionService } from '../../contribution/api/contribution.service';
import { FundingService } from '../../funding/api/funding.service';
import { LanguageService } from '../../language/api/service';
import { PublicationService } from '../../publication/api/publication.service';
import { PublisherId } from '../../publisher/model/publisher.types';
import { ReferenceService } from '../../reference/api/reference.service';
import { SeriesService } from '../../series';
import { SubjectService } from '../../subject/api/subject.service';
import { WorkDtoMapper } from '../model/work.mapper';
import {
  CREATE_ABSTRACT,
  CREATE_TITLE,
  CREATE_WORK,
  DELETE_ABSTRACT,
  DELETE_TITLE,
  MOVE_WORK_RELATION,
  UPDATE_ABSTRACT,
  UPDATE_TITLE,
} from '../model/work.mutations';
import {
  CREATE_WORK_RELATION,
  DELETE_WORK,
  GET_TRANSLATED_WORKS,
  GET_WORK,
  GET_WORK_CHAPTERS,
  GET_WORK_EDITIONS,
  GET_WORK_PREV_EDITIONS,
  GET_WORK_SET,
  GET_WORK_TRANSLATIONS,
  GET_WORKS,
  GET_WORKS_COUNT,
  UPDATE_WORK,
} from '../model/work.schema';
import type { WorkDto, WorkEntity, WorkId } from '../model/work.types';

export class WorkService extends BaseService<WorkEntity, WorkDto, WorkDtoMapper> {
  private readonly fundingService: FundingService;
  private readonly subjectService: SubjectService;
  private readonly contributionService: ContributionService;
  private readonly publicationService: PublicationService;
  private readonly languageService: LanguageService;
  private readonly seriesService: SeriesService;
  private readonly referenceService: ReferenceService;
  private readonly fileStorage: FileStorage;

  constructor(
    token: QueryToken,
    mapper = new WorkDtoMapper(),
    fundingService = new FundingService(token),
    subjectService = new SubjectService(token),
    contributionService = new ContributionService(token),
    publicationService = new PublicationService(token),
    languageService = new LanguageService(token),
    seriesService = new SeriesService(token),
    referenceService = new ReferenceService(token),
    fileStorage = new FileStorage(token),
  ) {
    super(token, mapper);
    this.fundingService = fundingService;
    this.subjectService = subjectService;
    this.contributionService = contributionService;
    this.publicationService = publicationService;
    this.languageService = languageService;
    this.seriesService = seriesService;
    this.referenceService = referenceService;
    this.fileStorage = fileStorage;
  }

  async createWork(data: WorkEntity): Promise<WorkEntity> {
    const { workId: _, ...dto } = this.dtoMapper.toDto(data) as WorkDto;

    const shouldCreateSubjects = data.subjects.length > 0;
    const shouldCreateContributions = data.contributions.length > 0;
    const shouldCreateFundings = data.fundings.length > 0;
    const shouldCreatePublications = data.publications.length > 0;
    const shouldCreateLanguages = data.languages.length > 0;
    const shouldCreateTitles = data.titles.length > 0;
    const shouldCreateAbstracts = data.abstracts.length > 0;
    const shouldCreateReferences = data.references.length > 0;

    const response = await this.graphqlService.mutation(CREATE_WORK, {
      data: dto,
      markupFormat: MarkdownFormats.enum.JATS_XML,
    });

    const work = this.dtoMapper.toEntity(response.createWork as WorkDto);

    if (shouldCreateTitles) {
      const titlesPromises = data.titles.map((title) => this.createTitle(title, work.id));

      const createdTitles = await Promise.all(titlesPromises);

      work.titles = createdTitles;
    }

    if (shouldCreateAbstracts) {
      const abstractsPromises = data.abstracts.map((abstract) => this.createAbstract(abstract, work.id));

      const createdAbstracts = await Promise.all(abstractsPromises);

      work.abstracts = createdAbstracts;
    }

    if (shouldCreateSubjects) {
      const subjectsPromises = data.subjects.map((subject) => this.subjectService.createSubject(subject, work.id));

      const createdSubjects = await Promise.all(subjectsPromises);

      work.subjects = createdSubjects;
    }

    if (shouldCreateFundings) {
      const fundingsPromises = data.fundings.map((funding) =>
        this.fundingService.createFunding({ data: funding, relatedWorkId: work.id }),
      );

      const createdFundings = await Promise.all(fundingsPromises);

      work.fundings = createdFundings;
    }

    if (shouldCreateContributions) {
      const contributionsPromises = data.contributions.map((contribution) =>
        this.contributionService.createContribution(contribution, work.id),
      );

      const createdContributions = await Promise.all(contributionsPromises);

      work.contributions = createdContributions;
    }

    if (shouldCreatePublications) {
      const publicationsPromises = data.publications.map((publication) =>
        this.publicationService.createPublication(publication, work.id),
      );

      const createdPublications = await Promise.all(publicationsPromises);

      work.publications = createdPublications;
    }

    if (shouldCreateLanguages) {
      const languagesPromises = data.languages.map((language) =>
        this.languageService.createLanguage(language, work.id),
      );

      const createdLanguages = await Promise.all(languagesPromises);

      work.languages = createdLanguages;
    }

    if (shouldCreateReferences) {
      const referencesPromises = data.references.map((reference) =>
        this.referenceService.createReference(reference, work.id),
      );

      const createdReferences = await Promise.all(referencesPromises);

      work.references = createdReferences;
    }

    return work;
  }

  async createWorkRelation(relatorWorkId: WorkId, relatedWorkId: WorkId, ordinal: number, relationType: RelationType) {
    const response = await this.graphqlService.mutation(CREATE_WORK_RELATION, {
      data: {
        relatorWorkId: relatorWorkId,
        relatedWorkId: relatedWorkId,
        relationOrdinal: ordinal,
        relationType,
      },
    });

    return response.createWorkRelation;
  }

  createChapter = async (chapter: WorkEntity, relatedWorkId: WorkId, ordinal: number) => {
    const createdChapter = await this.createWork(chapter);

    await this.createWorkRelation(createdChapter.id, relatedWorkId, ordinal, RelationType.IsChildOf);

    return createdChapter;
  };

  async updateWork(data: WorkEntity): Promise<WorkEntity> {
    const dto = this.dtoMapper.toDto(data) as WorkDto;

    const response = await this.graphqlService.mutation(UPDATE_WORK, {
      data: dto,
    });

    const work = this.dtoMapper.toEntity(response.updateWork as WorkDto);

    return work;
  }

  async deleteWork(workId: WorkId): Promise<void> {
    await this.graphqlService.mutation(DELETE_WORK, {
      workId,
    });
  }

  async getWork(workId: WorkId): Promise<WorkEntity> {
    const { work } = await this.graphqlService.query(GET_WORK, {
      workId,
      markupFormat: MarkdownFormats.enum.JATS_XML,
    });

    return this.dtoMapper.toEntity(work as WorkDto);
  }

  async getWorkChapters(workId: WorkId): Promise<WorkEntity[]> {
    const allChapters: WorkEntity[] = [];
    let offset = 0;
    let fetchedCount = 0;

    do {
      const { work: { relations } = { relations: [] } } = await this.graphqlService.query(GET_WORK_CHAPTERS, {
        workId,
        limit: this.limit,
        offset,
        markupFormat: MarkdownFormats.enum.JATS_XML,
      });

      const chapters = relations.map((relation) =>
        this.dtoMapper.toEntity({ ...relation.relatedWork, workRelationId: relation.workRelationId } as WorkDto),
      );
      allChapters.push(...chapters);

      fetchedCount = relations.length;
      offset += this.limit;
    } while (fetchedCount === this.limit);

    return allChapters;
  }

  async getWorkTranslations(workId: WorkId): Promise<WorkEntity[]> {
    const allTranslations: WorkEntity[] = [];
    let offset = 0;
    let fetchedCount = 0;

    do {
      const { work: { relations } = { relations: [] } } = await this.graphqlService.query(GET_WORK_TRANSLATIONS, {
        workId,
        limit: this.limit,
        offset,
        markupFormat: MarkdownFormats.enum.JATS_XML,
      });

      const translations = relations.map((relation) =>
        this.dtoMapper.toEntity({ ...relation.relatedWork, workRelationId: relation.workRelationId } as WorkDto),
      );
      allTranslations.push(...translations);

      fetchedCount = relations.length;
      offset += this.limit;
    } while (fetchedCount === this.limit);

    return allTranslations;
  }

  async getWorkEditions(workId: WorkId): Promise<WorkEntity[]> {
    const allEditions: WorkEntity[] = [];
    let offset = 0;
    let fetchedCount = 0;

    do {
      const { work: { relations } = { relations: [] } } = await this.graphqlService.query(GET_WORK_EDITIONS, {
        workId,
        limit: this.limit,
        offset,
        markupFormat: MarkdownFormats.enum.JATS_XML,
      });

      const editions = relations.map((relation) =>
        this.dtoMapper.toEntity({ ...relation.relatedWork, workRelationId: relation.workRelationId } as WorkDto),
      );
      allEditions.push(...editions);

      fetchedCount = relations.length;
      offset += this.limit;
    } while (fetchedCount === this.limit);

    return allEditions;
  }

  async getWorkPrevEditions(workId: WorkId): Promise<WorkEntity[]> {
    const allPrevEditions: WorkEntity[] = [];
    let offset = 0;
    let fetchedCount = 0;

    do {
      const { work: { relations } = { relations: [] } } = await this.graphqlService.query(GET_WORK_PREV_EDITIONS, {
        workId,
        limit: this.limit,
        offset,
        markupFormat: MarkdownFormats.enum.JATS_XML,
      });

      const editions = relations.map((relation) =>
        this.dtoMapper.toEntity({ ...relation.relatedWork, workRelationId: relation.workRelationId } as WorkDto),
      );
      allPrevEditions.push(...editions);

      fetchedCount = relations.length;
      offset += this.limit;
    } while (fetchedCount === this.limit);

    return allPrevEditions;
  }

  async getTranslatedWorks(workId: WorkId): Promise<WorkEntity[]> {
    const allTranslations: WorkEntity[] = [];
    let offset = 0;
    let fetchedCount = 0;

    do {
      const { work: { relations } = { relations: [] } } = await this.graphqlService.query(GET_TRANSLATED_WORKS, {
        workId,
        limit: this.limit,
        offset,
        markupFormat: MarkdownFormats.enum.JATS_XML,
      });

      const translations = relations.map((relation) =>
        this.dtoMapper.toEntity({ ...relation.relatedWork, workRelationId: relation.workRelationId } as WorkDto),
      );
      allTranslations.push(...translations);

      fetchedCount = relations.length;
      offset += this.limit;
    } while (fetchedCount === this.limit);

    return allTranslations;
  }

  async getWorks({
    publishersIds,
    offset = 0,
    limit = this.limit,
    direction,
    filter,
    workStatus,
    workTypes,
    field,
  }: {
    publishersIds: PublisherId[];
    offset?: number;
    limit?: number;
    direction?: Direction;
    filter?: string;
    workStatus?: WorkStatus;
    workTypes?: WorkType[];
    field?: WorkField;
  }): Promise<WorkEntity[]> {
    const { works = [] } = await this.graphqlService.query(GET_WORKS, {
      publishers: publishersIds,
      offset,
      limit,
      direction,
      filter,
      workStatus,
      workTypes,
      field,
      markupFormat: MarkdownFormats.enum.JATS_XML,
    });

    const data = works.map((work) => this.dtoMapper.toEntity(work as WorkDto));

    return data;
  }

  async getWorksCount({
    publishersIds,
    filter,
    workStatus,
    workTypes,
  }: {
    publishersIds: PublisherId[];
    filter?: string;
    workStatus?: WorkStatus;
    workTypes?: WorkType[];
  }): Promise<number> {
    const { workCount = 0 } = await this.graphqlService.query(GET_WORKS_COUNT, {
      publishers: publishersIds,
      filter,
      workStatus,
      workTypes,
    });

    return workCount;
  }

  async moveWorkRelation(workRelationId: string, newOrdinal: number) {
    await this.graphqlService.mutation(MOVE_WORK_RELATION, {
      workRelationId,
      newOrdinal,
    });
  }

  async createWorkTranslation(originalWorkId: WorkId, translation: WorkEntity): Promise<WorkEntity> {
    const createdTranslation = await this.createWork(translation);
    const translations = await this.getWorkTranslations(originalWorkId);
    const translationsCount = translations.length;

    await this.createWorkRelation(
      originalWorkId,
      createdTranslation.id,
      translationsCount + 1,
      RelationType.HasTranslation,
    );

    return createdTranslation;
  }

  async createNewWorkEdition(originalWork: WorkEntity, edition: WorkEntity): Promise<WorkEntity> {
    const createdEdition = await this.createWork(edition);
    const chapters = await this.getWorkChapters(originalWork.id);
    const editions = await this.getWorkEditions(originalWork.id);
    const editionsCount = editions.length;

    const copiedChapters = chapters.map((chapter, index) => ({
      chapter: {
        ...chapter,
        id: appConfig.defaultId,
        contributions: chapter.contributions.map((contribution) => ({
          ...contribution,
          id: appConfig.defaultId,
        })),
        subjects: chapter.subjects.map((subject) => ({
          ...subject,
          id: appConfig.defaultId,
        })),
        languages: chapter.languages.map((language) => ({
          ...language,
          id: appConfig.defaultId,
        })),
      },
      ordinal: index + 1,
    }));

    const chaptersPromises = copiedChapters.map(async ({ chapter, ordinal }) =>
      this.createChapter(chapter, createdEdition.id, ordinal),
    );

    await Promise.all(chaptersPromises);

    await this.createWorkRelation(originalWork.id, createdEdition.id, editionsCount + 1, RelationType.IsReplacedBy);

    if (originalWork.status === WorkStatuses.enum.Superseded) return createdEdition;

    await this.updateWork({
      ...originalWork,
      status: WorkStatuses.enum.Superseded,
      withdrawnDate: getDateInFuture(1),
      publicationDate: new Date().toISOString(),
    });

    return createdEdition;
  }

  async bulkCreateWorks(works: WorkEntity[], serieses: SeriesForUpdateItems, chapters: WorkEntity[]) {
    let count = 0;

    do {
      const work = works[count];
      const initialId = work.id;

      const createdWork = await this.createWork(work);

      const foundedSeries = Object.entries(serieses).find(([_seriedId, works]) => works.some((w) => w.id === work.id));
      const foundedChapters = chapters.filter((chapter) => chapter.relationId === initialId);

      await Promise.all(
        foundedChapters.map((chapter, index) => this.createChapter(chapter, createdWork.id, index + 1)),
      );

      if (!foundedSeries || foundedSeries[1].length === 0) {
        count++;
        continue;
      }

      await this.seriesService.createIssue({
        orderNumber: foundedSeries[1][0].orderNumber,
        seriesId: foundedSeries[0],
        workId: createdWork.id,
      });

      count++;
    } while (count < works.length);
  }

  async createTitle(data: TitleEntity, relatedWorkId: WorkId): Promise<TitleEntity> {
    const { titleId: _, ...dto } = this.dtoMapper.toDtoTitle(data);

    const markupFormat = isTextContainsAnyMarkdownTag(data.title)
      ? MarkdownFormats.enum.JATS_XML
      : MarkdownFormats.enum.PLAIN_TEXT;

    const response = await this.graphqlService.mutation(CREATE_TITLE, {
      data: { ...dto, workId: relatedWorkId },
      markupFormat,
    });

    const title = this.dtoMapper.toEntityTitle(response.createTitle as TitleDto);

    return title;
  }

  async updateTitle(data: TitleEntity, relatedWorkId: WorkId): Promise<TitleEntity> {
    const dto = this.dtoMapper.toDtoTitle(data);

    const markupFormat = isTextContainsAnyMarkdownTag(data.title)
      ? MarkdownFormats.enum.JATS_XML
      : MarkdownFormats.enum.PLAIN_TEXT;

    const response = await this.graphqlService.mutation(UPDATE_TITLE, {
      data: { ...dto, workId: relatedWorkId },
      markupFormat,
    });

    const title = this.dtoMapper.toEntityTitle(response.updateTitle as TitleDto);

    return title;
  }

  async deleteTitle(titleId: string): Promise<void> {
    await this.graphqlService.mutation(DELETE_TITLE, {
      titleId,
    });
  }

  async createAbstract(data: AbstractEntity, relatedWorkId: WorkId): Promise<AbstractEntity> {
    const { abstractId: _, ...dto } = this.dtoMapper.toDtoAbstract(data);

    const markupFormat = isTextContainsAnyMarkdownTag(data.content)
      ? MarkdownFormats.enum.JATS_XML
      : MarkdownFormats.enum.PLAIN_TEXT;

    const response = await this.graphqlService.mutation(CREATE_ABSTRACT, {
      data: { ...dto, workId: relatedWorkId },
      markupFormat,
    });

    const abstract = this.dtoMapper.toEntityAbstract(response.createAbstract as AbstractDto);

    return abstract;
  }

  async updateAbstract(data: AbstractEntity, relatedWorkId: WorkId): Promise<AbstractEntity> {
    const dto = this.dtoMapper.toDtoAbstract(data);

    const markupFormat = isTextContainsAnyMarkdownTag(data.content)
      ? MarkdownFormats.enum.JATS_XML
      : MarkdownFormats.enum.PLAIN_TEXT;

    const response = await this.graphqlService.mutation(UPDATE_ABSTRACT, {
      data: { ...dto, workId: relatedWorkId },
      markupFormat,
    });

    const abstract = this.dtoMapper.toEntityAbstract(response.updateAbstract as AbstractDto);

    return abstract;
  }

  async deleteAbstract(abstractId: string): Promise<void> {
    await this.graphqlService.mutation(DELETE_ABSTRACT, {
      abstractId,
    });
  }

  async getWorkSet(workId: WorkId): Promise<TitleEntity[]> {
    const { work: { relations } = { relations: [] } } = await this.graphqlService.query(GET_WORK_SET, {
      workId,
    });

    return relations.flatMap((relation) =>
      relation.relatedWork.titles.map((title) => this.dtoMapper.toEntityTitle(title as TitleDto)),
    );
  }

  async updateWorkFrontCover(workId: WorkId, file: File) {
    await this.fileStorage.uploadWorkCover(workId, file);
  }
}
