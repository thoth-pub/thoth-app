import { Direction, RelationType, WorkField, WorkStatus, WorkType } from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { appConfig } from '@/src/shared/config';
import { WorkStatuses } from '@/src/shared/constants';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { BaseService } from '@/src/shared/interfaces/services';
import { TransactionContext } from '@/src/shared/services';
import type {
  ImportExecutionObserver,
  ImportExecutionProgress,
  ImportExecutionStage,
  ImportExecutionWorkContext,
  ImportPlan,
  SeriesImportGroup,
  TitleDto,
  TitleEntity,
} from '@/src/shared/types';
import { getDateInFuture } from '@/src/shared/utils';
import { getDisplayTitle } from '@/src/shared/utils/work';

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
import { extractErrorMessage, ImportExecutionError } from '../model/import-execution.error';
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
import { ImportContributorRegistry } from './importContributorRegistry';

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

  /**
   * `contributorRegistry` is threaded in by {@link bulkCreateWorks} alone, and only far enough to
   * reach {@link ContributionService.createContribution}: contributions are created here with
   * `Promise.all`, so two occurrences of one ORCID on this work start concurrently and the
   * registry is what keeps them to a single contributor creation. Every other caller passes
   * nothing and gets exactly the behaviour it had before.
   */
  async createWork(data: WorkEntity, contributorRegistry?: ImportContributorRegistry): Promise<WorkEntity> {
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
        data.contributions.map((contribution) =>
          this.contributionService.createContribution(contribution, work.id, contributorRegistry),
        ),
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

  createChapter = async (
    chapter: WorkEntity,
    relatedWorkId: WorkId,
    ordinal: number,
    contributorRegistry?: ImportContributorRegistry,
  ) => {
    const createdChapter = await this.createWork(chapter, contributorRegistry);

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

    const { name, type, imprintId } = group.target.series;

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
      // Left empty rather than fabricated: an ONIX Collection supplies no equivalent.
      issnPrint: '',
      issnDigital: '',
      url: '',
      cfpUrl: '',
      description: '',
    });

    resolved.set(group, created.id);

    return created.id;
  }

  /**
   * The identity of a top-level work as it should read to a human, drawn from the plan rather
   * than fabricated. A DOI is preferred as the reference; failing that, the source reference;
   * a work that carries neither simply has none.
   */
  private static workContext(work: WorkEntity, position: number, chapterCount: number): ImportExecutionWorkContext {
    const doi = work.doi?.trim();
    const reference = work.reference?.trim();

    return {
      position,
      title: getDisplayTitle(work.titles).title,
      reference: doi || reference || undefined,
      chapterCount,
    };
  }

  /**
   * Hands one reading to the observer, and shields the import from it entirely. Observation is
   * meant to be inert: a throw from `onProgress` is the observer's own bug, never the import's,
   * so it is caught and logged here rather than allowed to escape. Were it to escape, the
   * surrounding try/catch below would mistake it for an API failure — turning it into an
   * {@link ImportExecutionError}, aborting the very mutation this reading precedes, and stopping
   * every later work. Isolating it here keeps the mutations, their order and their payloads
   * identical whether the observer throws, runs cleanly, or is absent.
   */
  private static reportProgress(observer: ImportExecutionObserver | undefined, progress: ImportExecutionProgress) {
    try {
      observer?.onProgress?.(progress);
    } catch (error) {
      console.error('Bulk import progress observer threw; the import was unaffected:', error);
    }
  }

  /**
   * Runs a planned bulk import: every work, its chapters, and its place in a series.
   *
   * The plan is the unit that crosses this boundary, rather than three arrays that have to be
   * kept in step by whoever calls it. Works are created in plan order, and a work is attached to
   * its series only after it exists, so a run that stops partway leaves no issue pointing at a
   * work that was never created.
   *
   * The optional {@link ImportExecutionObserver} is told, before each stage of each work, what is
   * about to happen — which top-level work, at which stage, and how many are already done. It
   * observes only: it is passed no data it could change, its readings never alter the order or the
   * payload of a single mutation below, and — because every reading goes through
   * {@link reportProgress} — a throw from it cannot touch the run either. A work counts as
   * `completed` only once its whole path (work, then chapters, then series) has returned. When a
   * *mutation* stage throws, the run stops and an {@link ImportExecutionError} is raised carrying
   * the original message plus that context; the work it stopped on is left as it was — partially
   * created, not rolled back.
   */
  async bulkCreateWorks(plan: ImportPlan, observer?: ImportExecutionObserver) {
    const { works, chapters, series } = plan;
    const total = works.length;
    const resolvedSeriesIds = new Map<SeriesImportGroup, SeriesId>();
    // New for this run and owned by it: contributor ids created here are facts about this
    // execution only, and no later import may inherit them. See ImportContributorRegistry.
    const contributorRegistry = new ImportContributorRegistry();

    // Built once, before any work is created: the plan says which series each work belongs to
    // and with which ordinal, and looking that up per work used to mean scanning every group's
    // membership twice. A work belongs to at most one group, so the first one to claim it wins,
    // exactly as a search over the groups in order would.
    const membershipByWorkId = new Map<WorkId, { group: SeriesImportGroup; orderNumber: number }>();

    for (const group of series) {
      for (const { workId, orderNumber } of group.members) {
        if (membershipByWorkId.has(workId)) continue;

        membershipByWorkId.set(workId, { group, orderNumber });
      }
    }

    let completed = 0;

    for (let index = 0; index < works.length; index += 1) {
      const work = works[index];
      const initialId = work.id;

      // Pure reads. Computing them before anything is created gives the progress reading a
      // chapter count and a display identity, and moves no mutation: the chapter filter and the
      // membership lookup touch nothing on the server.
      const foundedChapters = chapters.filter((chapter) => chapter.relationId === initialId);

      // The work's own ordinal, not the first ordinal in the series: a series can hold several
      // works from the same import, each with its own issue ordinal.
      const membership = membershipByWorkId.get(initialId);

      const current = WorkService.workContext(work, index + 1, foundedChapters.length);

      // Tracks which stage the work is at, so a throw can name it. It is the only thing the
      // catch below needs beyond the counts it already has.
      let stage: ImportExecutionStage = 'work';

      try {
        WorkService.reportProgress(observer, { total, completed, current, stage });

        const createdWork = await this.createWork(work, contributorRegistry);

        if (foundedChapters.length > 0) {
          stage = 'chapters';
          WorkService.reportProgress(observer, { total, completed, current, stage });

          await Promise.all(
            foundedChapters.map((chapter, chapterIndex) =>
              this.createChapter(chapter, createdWork.id, chapterIndex + 1, contributorRegistry),
            ),
          );
        }

        if (membership) {
          stage = 'series';
          WorkService.reportProgress(observer, { total, completed, current, stage });

          const seriesId = await this.resolveSeriesId(membership.group, resolvedSeriesIds);

          await this.seriesService.createIssue({
            orderNumber: membership.orderNumber,
            seriesId,
            workId: createdWork.id,
          });
        }
      } catch (error) {
        // The original message is kept verbatim as the thrown error's own message; the context
        // says where the run stopped. `completed` here is the number finished before this work,
        // which is exactly what "fully processed before the failure" means.
        throw new ImportExecutionError(extractErrorMessage(error), { total, completed, current, stage }, error);
      }

      completed += 1;
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
