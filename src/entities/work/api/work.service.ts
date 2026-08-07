import { Direction, RelationType, WorkField, WorkStatus, WorkType } from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { appConfig } from '@/src/shared/config';
import { WorkStatuses } from '@/src/shared/constants';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { BaseService } from '@/src/shared/interfaces/services';
import { TransactionContext } from '@/src/shared/services';
import type { SeriesImportGroup, SeriesImportPlan, TitleDto, TitleEntity } from '@/src/shared/types';
import { getDateInFuture } from '@/src/shared/utils';

import { AbstractService } from '../../abstract/api/abstract.service';
import { ContributionService } from '../../contribution/api/contribution.service';
import { FundingService } from '../../funding/api/funding.service';
import { LanguageService } from '../../language/api/language.service';
import { PublicationService } from '../../publication/api/publication.service';
import { PublisherId } from '../../publisher/model/publisher.types';
import { ReferenceService } from '../../reference/api/reference.service';
import { SeriesService } from '../../series';
import type { SeriesId } from '../../series/model/series.types';
import { SubjectService } from '../../subject/api/subject.service';
import { TitleService } from '../../title/api/title.service';
import { TitleDtoMapper } from '../../title/model/title.mapper';
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
  GET_WORK_SET,
  GET_WORK_TRANSLATIONS,
  GET_WORKS,
  GET_WORKS_COUNT,
  UPDATE_WORK,
} from '../model/work.schema';
import type { WorkDto, WorkEntity, WorkId } from '../model/work.types';

type WorkServiceDependencies = {
  graphqlService: GraphqlService;
  fundingService: FundingService;
  subjectService: SubjectService;
  contributionService: ContributionService;
  publicationService: PublicationService;
  languageService: LanguageService;
  seriesService: SeriesService;
  referenceService: ReferenceService;
  titleService: TitleService;
  abstractService: AbstractService;
  mapper?: WorkDtoMapper;
};

export class WorkService extends BaseService<WorkEntity, WorkDto, WorkDtoMapper> {
  private readonly fundingService: FundingService;
  private readonly subjectService: SubjectService;
  private readonly contributionService: ContributionService;
  private readonly publicationService: PublicationService;
  private readonly languageService: LanguageService;
  private readonly seriesService: SeriesService;
  private readonly referenceService: ReferenceService;
  private readonly titleService: TitleService;
  private readonly abstractService: AbstractService;

  constructor({
    graphqlService,
    fundingService,
    subjectService,
    contributionService,
    publicationService,
    languageService,
    seriesService,
    referenceService,
    titleService,
    abstractService,
    mapper = new WorkDtoMapper(),
  }: Readonly<WorkServiceDependencies>) {
    super(graphqlService, mapper);
    this.fundingService = fundingService;
    this.subjectService = subjectService;
    this.contributionService = contributionService;
    this.publicationService = publicationService;
    this.languageService = languageService;
    this.seriesService = seriesService;
    this.referenceService = referenceService;
    this.titleService = titleService;
    this.abstractService = abstractService;
  }

  private async getPaginatedRelations(
    query:
      | typeof GET_TRANSLATED_WORKS
      | typeof GET_WORK_CHAPTERS
      | typeof GET_WORK_TRANSLATIONS
      | typeof GET_WORK_EDITIONS
      | typeof GET_WORK_PREV_EDITIONS,
    workId: WorkId,
  ): Promise<WorkEntity[]> {
    const all: WorkEntity[] = [];
    let offset = 0;
    let fetchedCount = 0;

    do {
      const { work: { relations } = { relations: [] } } = await this.graphqlService.query(query, {
        workId,
        limit: this.limit,
        offset,
        markupFormat: MarkdownFormats.enum.JATS_XML,
      });

      all.push(
        ...relations.map((r) =>
          this.dtoMapper.toEntity({ ...r.relatedWork, workRelationId: r.workRelationId } as WorkDto),
        ),
      );
      fetchedCount = relations.length;
      offset += this.limit;
    } while (fetchedCount === this.limit);

    return all;
  }

  async createWork(data: WorkEntity): Promise<WorkEntity> {
    const { workId: _, ...dto } = this.dtoMapper.toDto(data) as WorkDto;

    const response = await this.graphqlService.mutation(CREATE_WORK, {
      data: dto,
      markupFormat: MarkdownFormats.enum.JATS_XML,
    });

    const work = this.dtoMapper.toEntity(response.createWork as WorkDto);
    const transactions = new TransactionContext();
    transactions.onRollback(() => this.deleteWork(work.id));

    try {
      work.titles = await this.titleService.createTitles(data.titles, work.id, transactions);

      const createdAbstracts = await Promise.all(
        data.abstracts.map((abstract) => this.abstractService.createAbstract(abstract, work.id)),
      );
      createdAbstracts.forEach((abstract) =>
        transactions.onRollback(() => this.abstractService.deleteAbstract(abstract.id)),
      );
      work.abstracts = createdAbstracts;

      const createdSubjects = await Promise.all(
        data.subjects.map((subject) => this.subjectService.createSubject(subject, work.id)),
      );
      createdSubjects.forEach((subject) =>
        transactions.onRollback(() => this.subjectService.deleteSubject(subject.id)),
      );
      work.subjects = createdSubjects;

      const createdFundings = await Promise.all(
        data.fundings.map((funding) => this.fundingService.createFunding({ data: funding, relatedWorkId: work.id })),
      );
      createdFundings.forEach((funding) =>
        transactions.onRollback(() => this.fundingService.deleteFunding({ fundingId: funding.id })),
      );
      work.fundings = createdFundings;

      const createdContributions = await Promise.all(
        data.contributions.map((contribution) => this.contributionService.createContribution(contribution, work.id)),
      );
      createdContributions.forEach((contribution) =>
        transactions.onRollback(() => this.contributionService.deleteContribution(contribution.id)),
      );
      work.contributions = createdContributions;

      const createdPublications = await Promise.all(
        data.publications.map((publication) => this.publicationService.createPublication(publication, work.id)),
      );
      createdPublications.forEach((publication) =>
        transactions.onRollback(async () => {
          await this.publicationService.deletePublication(publication.id);
        }),
      );
      work.publications = createdPublications;

      const createdLanguages = await Promise.all(
        data.languages.map((language) => this.languageService.createLanguage(language, work.id)),
      );
      work.languages = createdLanguages;

      const createdReferences = await Promise.all(
        data.references.map((reference) => this.referenceService.createReference(reference, work.id)),
      );
      createdReferences.forEach((r) => transactions.onRollback(() => this.referenceService.deleteReference(r.id)));
      work.references = createdReferences;

      return work;
    } catch (error) {
      await transactions.rollback();
      throw error;
    }
  }

  async createWorkRelation(relatorWorkId: WorkId, relatedWorkId: WorkId, ordinal: number, relationType: RelationType) {
    const response = await this.graphqlService.mutation(CREATE_WORK_RELATION, {
      data: {
        relatorWorkId,
        relatedWorkId,
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
    return this.getPaginatedRelations(GET_WORK_CHAPTERS, workId);
  }

  async getWorkTranslations(workId: WorkId): Promise<WorkEntity[]> {
    return this.getPaginatedRelations(GET_WORK_TRANSLATIONS, workId);
  }

  async getWorkEditions(workId: WorkId): Promise<WorkEntity[]> {
    return this.getPaginatedRelations(GET_WORK_EDITIONS, workId);
  }

  async getWorkPrevEditions(workId: WorkId): Promise<WorkEntity[]> {
    return this.getPaginatedRelations(GET_WORK_PREV_EDITIONS, workId);
  }

  async getTranslatedWorks(workId: WorkId): Promise<WorkEntity[]> {
    return this.getPaginatedRelations(GET_TRANSLATED_WORKS, workId);
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
    const [chapters, editions] = await Promise.all([
      this.getWorkChapters(originalWork.id),
      this.getWorkEditions(originalWork.id),
    ]);
    const editionsCount = editions.length;

    const copiedChapters = chapters.map((chapter, index) => ({
      chapter: {
        ...chapter,
        id: appConfig.defaultId,
        titles: chapter.titles.map((title) => ({
          ...title,
          id: appConfig.defaultId,
        })),
        abstracts: chapter.abstracts.map((abstract) => ({
          ...abstract,
          id: appConfig.defaultId,
        })),
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

  /**
   * Resolves a planned series group to a real Thoth series id, creating the series the first
   * time it is needed and reusing that id for every later work in the same group.
   *
   * Creation is lazy on purpose. Creating every proposed series up front would leave orphan
   * series behind whenever work creation later failed; doing it on first use means a series is
   * only ever created once a work that belongs to it has actually been created.
   */
  private async resolveSeriesId(group: SeriesImportGroup, resolved: Map<SeriesImportGroup, SeriesId>) {
    const alreadyResolved = resolved.get(group);

    if (alreadyResolved) return alreadyResolved;

    if (group.target.kind === 'existing') {
      resolved.set(group, group.target.seriesId);

      return group.target.seriesId;
    }

    const { name, type, imprintId, issnPrint, issnDigital, url, cfpUrl, description } = group.target.series;

    const created = await this.seriesService.createSeries({
      // createSeries strips id, issues and updatedAt before building the mutation input; the
      // placeholder id below is never sent and never treated as a real series id.
      id: appConfig.defaultId,
      issues: [],
      updatedAt: '',
      imprintName: '',
      name,
      type,
      imprintId,
      issnPrint,
      issnDigital,
      url,
      cfpUrl,
      description,
    });

    resolved.set(group, created.id);

    return created.id;
  }

  async bulkCreateWorks(works: WorkEntity[], seriesPlan: SeriesImportPlan, chapters: WorkEntity[]) {
    const resolvedSeriesIds = new Map<SeriesImportGroup, SeriesId>();

    for (const work of works) {
      const initialId = work.id;

      const createdWork = await this.createWork(work);

      const foundedChapters = chapters.filter((chapter) => chapter.relationId === initialId);

      await Promise.all(
        foundedChapters.map((chapter, index) => this.createChapter(chapter, createdWork.id, index + 1)),
      );

      const group = seriesPlan.find(({ works: seriesWorks }) => seriesWorks.some(({ id }) => id === initialId));

      if (!group) continue;

      // Take this work's own ordinal, not the first ordinal in the series: a series can hold
      // several works from the same import, each with its own issue ordinal.
      const seriesItem = group.works.find((seriesWork) => seriesWork.id === initialId);

      if (!seriesItem) continue;

      const seriesId = await this.resolveSeriesId(group, resolvedSeriesIds);

      await this.seriesService.createIssue({
        orderNumber: seriesItem.orderNumber,
        seriesId,
        workId: createdWork.id,
      });
    }
  }

  async getWorkSet(workId: WorkId): Promise<TitleEntity[]> {
    const titleMapper = new TitleDtoMapper();

    const { work: { relations } = { relations: [] } } = await this.graphqlService.query(GET_WORK_SET, {
      workId,
    });

    return relations.flatMap((relation) =>
      relation.relatedWork.titles.map((title) => titleMapper.toEntity(title as TitleDto)),
    );
  }
}
