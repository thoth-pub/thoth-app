import { Direction, RelationType, WorkField, WorkStatus, WorkType } from '@/gql/graphql';
import { appConfig, getDateInFuture, WorkStatuses } from '@/src/shared';
import { BaseService } from '@/src/shared/interfaces/services';

import { ContributionService } from '../../contribution/api/contribution.service';
import { FundingService } from '../../funding/api/funding.service';
import { LanguageService } from '../../language/api/service';
import { PublicationService } from '../../publication/api/publication.service';
import { PublisherId } from '../../publisher/model/publisher.types';
import { SubjectService } from '../../subject/api/subject.service';
import { WorkDtoMapper } from '../model/work.mapper';
import { CREATE_WORK, MOVE_WORK_RELATION } from '../model/work.mutations';
import {
  CREATE_WORK_RELATION,
  DELETE_WORK,
  GET_TRANSLATED_WORKS,
  GET_WORK,
  GET_WORK_CHAPTERS,
  GET_WORK_EDITIONS,
  GET_WORK_PREV_EDITIONS,
  GET_WORK_TRANSLATIONS,
  GET_WORKS,
  GET_WORKS_COUNT,
  UPDATE_WORK,
} from '../model/work.schema';
import type { WorkDto, WorkEntity, WorkId } from '../model/work.types';

export class WorkService extends BaseService<WorkEntity, WorkDto> {
  private readonly fundingService: FundingService;
  private readonly subjectService: SubjectService;
  private readonly contributionService: ContributionService;
  private readonly publicationService: PublicationService;
  private readonly languageService: LanguageService;

  constructor(
    mapper = new WorkDtoMapper(),
    fundingService = new FundingService(),
    subjectService = new SubjectService(),
    contributionService = new ContributionService(),
    publicationService = new PublicationService(),
    languageService = new LanguageService(),
  ) {
    super(mapper);
    this.fundingService = fundingService;
    this.subjectService = subjectService;
    this.contributionService = contributionService;
    this.publicationService = publicationService;
    this.languageService = languageService;
  }

  async createWork(token: string, data: WorkEntity): Promise<WorkEntity> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { workId: _, ...dto } = this.dtoMapper.toDto(data) as WorkDto;

    const shouldCreateSubjects = data.subjects.length > 0;
    const shouldCreateContributions = data.contributions.length > 0;
    const shouldCreateFundings = data.fundings.length > 0;
    const shouldCreatePublications = data.publications.length > 0;
    const shouldCreateLanguages = data.languages.length > 0;

    const response = await this.graphqlService.mutation(token, CREATE_WORK, {
      data: dto,
    });

    const work = this.dtoMapper.toEntity(response.createWork as WorkDto);

    if (shouldCreateSubjects) {
      const subjectsPromises = data.subjects.map((subject) =>
        this.subjectService.createSubject(token, subject, work.id),
      );

      const createdSubjects = await Promise.all(subjectsPromises);

      work.subjects = createdSubjects;
    }

    if (shouldCreateFundings) {
      const fundingsPromises = data.fundings.map((funding) =>
        this.fundingService.createFunding({ token, data: funding, relatedWorkId: work.id }),
      );

      const createdFundings = await Promise.all(fundingsPromises);

      work.fundings = createdFundings;
    }

    if (shouldCreateContributions) {
      const contributionsPromises = data.contributions.map((contribution) =>
        this.contributionService.createContribution(token, contribution, work.id),
      );

      const createdContributions = await Promise.all(contributionsPromises);

      work.contributions = createdContributions;
    }

    if (shouldCreatePublications) {
      const publicationsPromises = data.publications.map((publication) =>
        this.publicationService.createPublication(token, publication, work.id),
      );

      const createdPublications = await Promise.all(publicationsPromises);

      work.publications = createdPublications;
    }

    if (shouldCreateLanguages) {
      const languagesPromises = data.languages.map((language) =>
        this.languageService.createLanguage(token, language, work.id),
      );

      const createdLanguages = await Promise.all(languagesPromises);

      work.languages = createdLanguages;
    }

    return work;
  }

  async createWorkRelation(
    token: string,
    relatorWorkId: WorkId,
    relatedWorkId: WorkId,
    ordinal: number,
    relationType: RelationType,
  ) {
    const response = await this.graphqlService.mutation(token, CREATE_WORK_RELATION, {
      data: {
        relatorWorkId: relatorWorkId,
        relatedWorkId: relatedWorkId,
        relationOrdinal: ordinal,
        relationType,
      },
    });

    return response.createWorkRelation;
  }

  createChapter = async (token: string, chapter: WorkEntity, relatedWorkId: WorkId, ordinal: number) => {
    const createdChapter = await this.createWork(token, chapter);

    await this.createWorkRelation(token, createdChapter.id, relatedWorkId, ordinal, RelationType.IsChildOf);

    return createdChapter;
  };

  async updateWork(token: string, data: WorkEntity): Promise<WorkEntity> {
    const dto = this.dtoMapper.toDto(data) as WorkDto;

    const response = await this.graphqlService.mutation(token, UPDATE_WORK, {
      data: dto,
    });

    const work = this.dtoMapper.toEntity(response.updateWork as WorkDto);

    return work;
  }

  async deleteWork(token: string, workId: WorkId): Promise<void> {
    await this.graphqlService.mutation(token, DELETE_WORK, {
      workId,
    });
  }

  async getWork(workId: WorkId): Promise<WorkEntity> {
    const { work } = await this.graphqlService.query(GET_WORK, {
      workId,
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

  async moveWorkRelation(token: string, workRelationId: string, newOrdinal: number) {
    await this.graphqlService.mutation(token, MOVE_WORK_RELATION, {
      workRelationId,
      newOrdinal,
    });
  }

  async createWorkTranslation(token: string, originalWorkId: WorkId, translation: WorkEntity): Promise<WorkEntity> {
    const createdTranslation = await this.createWork(token, translation);
    const translations = await this.getWorkTranslations(originalWorkId);
    const translationsCount = translations.length;

    await this.createWorkRelation(
      token,
      originalWorkId,
      createdTranslation.id,
      translationsCount + 1,
      RelationType.HasTranslation,
    );

    return createdTranslation;
  }

  async createNewWorkEdition(token: string, originalWork: WorkEntity, edition: WorkEntity): Promise<WorkEntity> {
    const createdEdition = await this.createWork(token, edition);
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
      this.createChapter(token, chapter, createdEdition.id, ordinal),
    );

    await Promise.all(chaptersPromises);

    await this.createWorkRelation(
      token,
      originalWork.id,
      createdEdition.id,
      editionsCount + 1,
      RelationType.IsReplacedBy,
    );

    if (originalWork.status === WorkStatuses.enum.Superseded) return createdEdition;

    await this.updateWork(token, {
      ...originalWork,
      status: WorkStatuses.enum.Superseded,
      withdrawnDate: getDateInFuture(1),
      publicationDate: new Date().toISOString(),
    });

    return createdEdition;
  }
}
