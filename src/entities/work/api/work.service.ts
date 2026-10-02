import { Direction, RelationType, ResourceType, WorkField, WorkStatus, WorkType } from '@/gql/graphql';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { appConfig } from '@/src/shared/config';
import { WorkStatuses } from '@/src/shared/constants';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { BaseService } from '@/src/shared/interfaces/services';
import { TransactionContext } from '@/src/shared/services';
import type {
  ImportCleanupDisposition,
  ImportCleanupFailure,
  ImportCleanupRecord,
  ImportExecutionAction,
  ImportExecutionObserver,
  ImportExecutionProgress,
  ImportExecutionStage,
  ImportExecutionUnit,
  ImportExecutionWorkContext,
  ImportPlan,
  ImportRelationEdge,
  ImportWorkRef,
  OnixImportExecutionStage,
  OnixStatedCounts,
  OnixWorkRelationType,
  SeriesImportGroup,
  TitleDto,
  TitleEntity,
} from '@/src/shared/types';
import { getDateInFuture } from '@/src/shared/utils';
import { getDisplayTitle } from '@/src/shared/utils/work';

import { AbstractService } from '../../abstract/api/abstract.service';
import { AdditionalResourceDtoMapper } from '../../additional-resource/model/additional-resource.mapper';
import {
  CREATE_ADDITIONAL_RESOURCE,
  DELETE_ADDITIONAL_RESOURCE,
} from '../../additional-resource/model/additional-resource.mutations';
import type { AdditionalResourceDto } from '../../additional-resource/model/additional-resource.types';
import { AwardDtoMapper } from '../../award/model/award.mapper';
import { CREATE_AWARD, DELETE_AWARD } from '../../award/model/award.mutations';
import type { AwardDto } from '../../award/model/award.types';
import { BookReviewDtoMapper } from '../../book-review/model/book-review.mapper';
import { CREATE_BOOK_REVIEW, DELETE_BOOK_REVIEW } from '../../book-review/model/book-review.mutations';
import type { BookReviewDto } from '../../book-review/model/book-review.types';
import { ContributionService } from '../../contribution/api/contribution.service';
import { EndorsementDtoMapper } from '../../endorsement/model/endorsement.mapper';
import { CREATE_ENDORSEMENT, DELETE_ENDORSEMENT } from '../../endorsement/model/endorsement.mutations';
import type { EndorsementDto } from '../../endorsement/model/endorsement.types';
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
import { CREATE_WORK, DELETE_WORK_RELATION, MOVE_WORK_RELATION } from '../model/work.mutations';
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

/** The stage each ONIX execution action runs at (thoth-app#187). */
const ONIX_ACTION_STAGES: Readonly<Record<ImportExecutionAction['kind'], OnixImportExecutionStage>> = {
  CREATE_WORK: 'work',
  CREATE_PUBLICATION: 'publication',
  CREATE_CHAPTER: 'chapter',
  CREATE_CONTAINED_WORK: 'containedWork',
  CREATE_ADDITIONAL_RESOURCE: 'additionalResource',
  CREATE_BOOK_REVIEW: 'bookReview',
  CREATE_ENDORSEMENT: 'endorsement',
  CREATE_AWARD: 'award',
  CREATE_SERIES_ISSUE: 'series',
  CREATE_WORK_RELATION: 'relation',
};

/** The binding order of a unit's stages: chapters and contained Works share one, in their confirmed source order. */
const ONIX_STAGE_RANKS: Readonly<Record<OnixImportExecutionStage, number>> = {
  noop: 0,
  work: 1,
  publication: 2,
  chapter: 3,
  containedWork: 3,
  additionalResource: 4,
  bookReview: 5,
  endorsement: 6,
  award: 7,
  series: 8,
  relation: 9,
};

/** The backend relation type of each planned non-chapter Work relation. */
const RELATION_TYPES: Readonly<Record<OnixWorkRelationType, RelationType>> = {
  HAS_TRANSLATION: RelationType.HasTranslation,
  IS_TRANSLATION_OF: RelationType.IsTranslationOf,
  HAS_PART: RelationType.HasPart,
  IS_PART_OF: RelationType.IsPartOf,
  REPLACES: RelationType.Replaces,
  IS_REPLACED_BY: RelationType.IsReplacedBy,
};

/**
 * The attempt-local write journal of one ONIX execution unit (thoth-app#187). It lives in memory for that unit's run
 * only, is never written back into the plan, and holds operations, ids, action keys and stages - never a payload or a
 * token.
 *
 * It records every Work row the unit created, and every other write deleting those Works would not remove: an entity
 * created under an existing Work, or a relation between two Works the unit did not create. A create that was sent but
 * whose result named nothing it created, and that deleting those Works would not remove either, may exist without
 * anything to remove it by: it is recorded as unknown. A Contributor is never recorded: one the unit created may
 * survive as an unreferenced row, which is accepted residue and is never deleted.
 */
class ImportUnitAttempt {
  /** Whether the unit has sent any mutation: until it has, nothing of it can have been saved. */
  issued = false;

  readonly entries: ImportCleanupRecord[] = [];

  readonly unknown: ImportCleanupFailure[] = [];

  private readonly createdWorkIds = new Set<WorkId>();

  record(entry: ImportCleanupRecord) {
    this.entries.push(entry);

    if (entry.operation === 'DELETE_WORK') this.createdWorkIds.add(entry.entityId);
  }

  /** Whether deleting a Work this unit created removes whatever was written under the given Work. */
  covers(workId: WorkId) {
    return this.createdWorkIds.has(workId);
  }

  unknownCreate(actionKey: string, stage: OnixImportExecutionStage, reason: string) {
    this.unknown.push({ operation: 'CREATE_OUTCOME_UNKNOWN', entityId: null, actionKey, stage, reason });
  }
}

/**
 * What one ONIX run reads its confirmed plan through, indexed once before any mutation, and the backend ids it learns.
 */
type OnixRun = {
  readonly plan: ImportPlan;
  readonly works: ReadonlyMap<WorkId, WorkEntity>;
  readonly chapters: ReadonlyMap<WorkId, WorkEntity>;
  readonly containedWorks: ReadonlyMap<WorkId, WorkEntity>;
  readonly relations: ReadonlyMap<string, ImportRelationEdge>;
  /** The contribution ordinals each source contributor expanded into, per planned Work, chapter or contained Work. */
  readonly intents: ReadonlyMap<WorkId, number[][]>;
  /** The counts each planned Work's source states, zero included. */
  readonly counts: ReadonlyMap<WorkId, OnixStatedCounts>;
  /** The backend id of each planned Work, once the unit that creates it has. */
  readonly resolved: Map<WorkId, WorkId>;
  readonly seriesIds: Map<SeriesImportGroup, SeriesId>;
  readonly registry: ImportContributorRegistry;
};

/** Why a confirmed ONIX plan cannot be run as it stands, found before its first mutation. */
type OnixPlanProblem = {
  readonly message: string;
  readonly unit: ImportExecutionUnit | undefined;
  readonly stage: OnixImportExecutionStage;
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
   *
   * `contributorIntents` is also a bulk import's alone: the contribution ordinals one source contributor
   * expanded into (an ONIX editor who also translated, thoth-app#183). Those contributions are one person,
   * so the first creates the contributor when it is new and every other one points at it, ORCID or not.
   *
   * `statedCounts` is a bulk import's too: the counts its source states, zero included. The Work entity holds an
   * unset count as 0, which the mapper writes as unset, so a count stated as zero is written as 0 here instead.
   */
  async createWork(
    data: WorkEntity,
    contributorRegistry?: ImportContributorRegistry,
    contributorIntents: readonly (readonly number[])[] = [],
    statedCounts: OnixStatedCounts = {},
  ): Promise<WorkEntity> {
    return this.createWorkRow(data, contributorRegistry, contributorIntents, statedCounts);
  }

  /**
   * The one way a Work row and everything it owns is created: every caller of {@link createWork}, and an ONIX import's
   * execution units (thoth-app#187), which create no Publication here - the plan's explicit Publication actions do -
   * and which pass `onCreated`.
   *
   * Without `onCreated` a failure rolls back what was created, the Work included, exactly as it always has. With it,
   * the caller is told the Work's id the moment the backend returns one, before anything is written under it, and owns
   * the Work's removal: its verified cleanup deletes the Work, and with it everything written under it, and proves it
   * did. A response that names no Work is never taken for one.
   */
  private async createWorkRow(
    data: WorkEntity,
    contributorRegistry: ImportContributorRegistry | undefined,
    contributorIntents: readonly (readonly number[])[],
    statedCounts: OnixStatedCounts,
    onCreated?: (workId: WorkId) => void,
  ): Promise<WorkEntity> {
    const { workId: _, ...dto } = { ...(this.dtoMapper.toDto(data) as WorkDto), ...statedCounts };

    const response = await this.graphqlService.mutation(CREATE_WORK, {
      data: dto,
      markupFormat: MarkdownFormats.enum.JATS_XML,
    });

    const work = this.dtoMapper.toEntity(response.createWork as WorkDto);
    const transactions = new TransactionContext();

    if (onCreated === undefined) {
      transactions.onRollback(() => this.deleteWork(work.id));
    } else {
      if (typeof work.id !== 'string' || work.id.length === 0) {
        throw new Error('Creating the Work returned no Work id, so whether it was created is not known');
      }

      onCreated(work.id);
    }

    // The title stage is all or nothing and rolls its own failure back, the work included, so it is rolled back once.
    work.titles = await this.titleService.createTitles(data.titles, work.id, transactions);

    try {
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

      const createdContributions = await this.createContributions(
        data.contributions,
        work.id,
        contributorRegistry,
        contributorIntents,
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
      // An import's Work is removed by the import's own verified cleanup instead, which never deletes it twice.
      if (onCreated === undefined) await transactions.rollback();
      throw error;
    }
  }

  /**
   * Creates a work's contributions concurrently, except that the contributions of one source contributor are
   * created in turn: the first resolves the contributor, and the rest reuse the id it returned. The result keeps
   * the order the contributions were planned in.
   */
  private async createContributions(
    contributions: WorkEntity['contributions'],
    workId: WorkId,
    contributorRegistry: ImportContributorRegistry | undefined,
    contributorIntents: readonly (readonly number[])[],
  ) {
    const created: WorkEntity['contributions'] = [];
    // The contributions each first contribution of a source contributor is followed by, by index.
    const followers = new Map<number, number[]>();
    const following = new Set<number>();

    contributorIntents
      .map((ordinals) =>
        contributions.flatMap((contribution, index) => (ordinals.includes(contribution.orderNumber) ? [index] : [])),
      )
      .filter((indices) => indices.length > 1)
      .forEach(([first, ...rest]) => {
        followers.set(first, rest);
        rest.forEach((index) => following.add(index));
      });

    const create = async (index: number, contributorId?: string) => {
      created[index] = await this.contributionService.createContribution(
        contributorId === undefined ? contributions[index] : { ...contributions[index], contributorId },
        workId,
        contributorRegistry,
      );

      return created[index];
    };

    // Started in plan order, as before; a source contributor's later contributions wait for its first.
    await Promise.all(
      contributions.flatMap((_contribution, index) =>
        following.has(index)
          ? []
          : [
              create(index).then(({ contributorId }) =>
                Promise.all((followers.get(index) ?? []).map((follower) => create(follower, contributorId))),
              ),
            ],
      ),
    );

    return created;
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
    contributorIntents: readonly (readonly number[])[] = [],
  ) => {
    const createdChapter = await this.createWork(chapter, contributorRegistry, contributorIntents);

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

    const { name, type, imprintId, issnPrint = '', issnDigital = '' } = group.target.series;

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
      // Only an ISSN the publisher assigned to a form; never fabricated.
      issnPrint,
      issnDigital,
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
   * Runs a planned bulk import. A confirmed ONIX plan runs its explicit execution units (thoth-app#187), see
   * {@link executeOnixPlan}. A CSV plan runs as below: every work, its chapters, and its place in a series.
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
    // A confirmed ONIX plan runs its own explicit execution units (thoth-app#187); a CSV plan runs exactly as it always
    // has.
    if (plan.onix !== undefined) {
      await this.executeOnixPlan(plan, observer);

      return;
    }

    const { works, chapters, series } = plan;
    const total = works.length;
    const resolvedSeriesIds = new Map<SeriesImportGroup, SeriesId>();
    // New for this run and owned by it: contributor ids created here are facts about this
    // execution only, and no later import may inherit them. See ImportContributorRegistry.
    const contributorRegistry = new ImportContributorRegistry();

    // Built once, before any work is created: the plan says which series each work belongs to,
    // with which ordinal and issue number. An ONIX work may be an issue of more than one series
    // (thoth-app#183); each membership is attached in plan order. A membership naming one series
    // twice for one work is refused before a plan exists, so none is deduplicated here.
    const membershipsByWorkId = new Map<
      WorkId,
      { group: SeriesImportGroup; orderNumber: number; issueNumber?: number | null }[]
    >();

    for (const group of series) {
      for (const { workId, orderNumber, issueNumber } of group.members) {
        membershipsByWorkId.set(workId, [
          ...(membershipsByWorkId.get(workId) ?? []),
          { group, orderNumber, ...(issueNumber === undefined ? {} : { issueNumber }) },
        ]);
      }
    }

    // A CSV plan states no contributor intents and no counts (an ONIX plan's are its execution units' to apply), so
    // every work and chapter is given the empty ones it always has been.
    const noIntents: number[][] = [];
    const noCounts: OnixStatedCounts = {};

    let completed = 0;

    for (let index = 0; index < works.length; index += 1) {
      const work = works[index];
      const initialId = work.id;

      // Pure reads. Computing them before anything is created gives the progress reading a
      // chapter count and a display identity, and moves no mutation: the chapter filter and the
      // membership lookup touch nothing on the server.
      const foundedChapters = chapters.filter((chapter) => chapter.relationId === initialId);

      // The work's own ordinals, not the first ordinal in each series: a series can hold several
      // works from the same import, each with its own issue ordinal.
      const memberships = membershipsByWorkId.get(initialId) ?? [];

      const current = WorkService.workContext(work, index + 1, foundedChapters.length);

      // Tracks which stage the work is at, so a throw can name it. It is the only thing the
      // catch below needs beyond the counts it already has.
      let stage: ImportExecutionStage = 'work';

      try {
        WorkService.reportProgress(observer, { total, completed, current, stage });

        const createdWork = await this.createWork(work, contributorRegistry, noIntents, noCounts);

        if (foundedChapters.length > 0) {
          stage = 'chapters';
          WorkService.reportProgress(observer, { total, completed, current, stage });

          await Promise.all(
            foundedChapters.map((chapter, chapterIndex) =>
              this.createChapter(chapter, createdWork.id, chapterIndex + 1, contributorRegistry, noIntents),
            ),
          );
        }

        if (memberships.length > 0) {
          stage = 'series';
          WorkService.reportProgress(observer, { total, completed, current, stage });

          for (const { group, orderNumber, ...issue } of memberships) {
            const seriesId = await this.resolveSeriesId(group, resolvedSeriesIds);

            await this.seriesService.createIssue({ orderNumber, seriesId, workId: createdWork.id, ...issue });
          }
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

  /**
   * How one ONIX execution unit reads to a human (thoth-app#187): its frozen display identity, the chapters it creates,
   * and what it targets - a new Work, an exact existing Work, or nothing to do at all.
   */
  private static unitContext(unit: ImportExecutionUnit): ImportExecutionWorkContext {
    return {
      position: unit.sourceOrder,
      title: unit.display.title,
      reference: unit.display.reference ?? undefined,
      chapterCount: unit.actions.filter(({ kind }) => kind === 'CREATE_CHAPTER').length,
      unit: unit.actions.length === 0 ? 'NOOP' : unit.target.kind === 'PLANNED_WORK' ? 'NEW_WORK' : 'EXISTING_WORK',
    };
  }

  /**
   * Every check a confirmed ONIX plan passes before its first mutation (thoth-app#187), so that execution only ever
   * performs what the plan already decided, and never decides anything itself:
   *
   * - the plan carries its execution units, in source order, and every action has one key;
   * - a unit creating a Work begins by creating it, and its actions follow the binding stage order;
   * - every action names a payload the plan holds, under the Work its unit targets or one it creates;
   * - every planned Work row, every Publication of every new Work, every Series membership and every planned relation
   *   is performed by exactly one action, so nothing the plan holds is ever silently left out;
   * - a relation runs only in a unit by which every Work it names that the plan creates already exists;
   * - a Publication holds at most one canonical Location.
   *
   * The first problem found is returned, with the unit it is about, and nothing is sent.
   */
  private static validateOnixPlan(plan: ImportPlan): OnixPlanProblem | null {
    const units = plan.execution?.units;

    if (units === undefined) {
      return {
        message: 'This ONIX plan carries no execution units, so it cannot be run: nothing was created',
        unit: undefined,
        stage: 'noop',
      };
    }

    const works = new Map(plan.works.map((work) => [work.id, work]));
    const chapters = new Map(plan.chapters.map((chapter) => [chapter.id, chapter]));
    const containedWorks = new Map((plan.containedWorks ?? []).map((work) => [work.id, work]));
    const relations = new Map((plan.relations ?? []).map((edge) => [edge.key, edge]));
    /** Each planned Work row, by the source order of the unit that creates it. */
    const createdIn = new Map<WorkId, number>();
    const publications = new Set<string>();
    const memberships = new Set<string>();
    const createdRelations = new Set<string>();
    const actionKeys = new Set<string>();

    for (const [index, unit] of units.entries()) {
      const problem = (message: string, stage: OnixImportExecutionStage): OnixPlanProblem => ({
        message: `Execution unit ${unit.sourceOrder} of this ONIX plan cannot be run as planned: ${message}. Nothing was created`,
        unit,
        stage,
      });
      const isTarget = (ref: ImportWorkRef) => ref.kind === unit.target.kind && ref.workId === unit.target.workId;
      const unitWorks = new Set<WorkId>();
      let rank = 0;

      if (unit.sourceOrder !== index + 1) return problem('it is out of source order', 'noop');

      if (unit.target.kind === 'PLANNED_WORK') {
        const [first] = unit.actions;

        if (first?.kind !== 'CREATE_WORK' || first.workId !== unit.target.workId) {
          return problem('it does not begin by creating its Work', 'work');
        }
      }

      for (const action of unit.actions) {
        const stage = ONIX_ACTION_STAGES[action.kind];

        if (actionKeys.has(action.actionKey)) return problem(`action ${action.actionKey} is planned twice`, stage);
        if (ONIX_STAGE_RANKS[stage] < rank) return problem(`action ${action.actionKey} is out of stage order`, stage);

        actionKeys.add(action.actionKey);
        rank = ONIX_STAGE_RANKS[stage];

        switch (action.kind) {
          case 'CREATE_WORK':
            if (!isTarget({ kind: 'PLANNED_WORK', workId: action.workId }) || !works.has(action.workId)) {
              return problem(`its Work ${action.workId} is not one the plan holds for it`, stage);
            }
            if (createdIn.has(action.workId)) return problem(`Work ${action.workId} is created twice`, stage);

            createdIn.set(action.workId, unit.sourceOrder);
            unitWorks.add(action.workId);
            break;
          case 'CREATE_PUBLICATION': {
            const { publication: source, work } = action;
            const publication =
              source.source === 'WORK'
                ? work.kind === 'PLANNED_WORK'
                  ? works.get(work.workId)?.publications[source.index]
                  : undefined
                : work.kind === 'EXISTING_WORK'
                  ? source.publication
                  : undefined;

            if (!isTarget(work) || publication === undefined) {
              return problem(`Publication ${action.actionKey} names no Publication the plan holds for its Work`, stage);
            }
            if (publication.locations.filter(({ canonical }) => canonical).length > 1) {
              return problem(`Publication ${action.actionKey} holds more than one canonical Location`, stage);
            }

            if (source.source === 'WORK') {
              const key = `${work.workId}|${source.index}`;

              if (publications.has(key)) return problem(`Publication ${action.actionKey} is created twice`, stage);

              publications.add(key);
            }
            break;
          }
          case 'CREATE_CHAPTER':
          case 'CREATE_CONTAINED_WORK': {
            const row = (action.kind === 'CREATE_CHAPTER' ? chapters : containedWorks).get(action.workId);

            if (
              !isTarget(action.parent) ||
              action.parent.kind !== 'PLANNED_WORK' ||
              row === undefined ||
              row.relationId !== action.parent.workId ||
              !Number.isInteger(action.ordinal) ||
              action.ordinal < 1
            ) {
              return problem(`${action.actionKey} names no Work, parent or ordinal the plan holds for it`, stage);
            }
            if (createdIn.has(action.workId)) return problem(`Work ${action.workId} is created twice`, stage);

            createdIn.set(action.workId, unit.sourceOrder);
            unitWorks.add(action.workId);
            break;
          }
          case 'CREATE_ADDITIONAL_RESOURCE':
          case 'CREATE_BOOK_REVIEW':
          case 'CREATE_ENDORSEMENT':
          case 'CREATE_AWARD':
            if (!isTarget(action.work) && !(action.work.kind === 'PLANNED_WORK' && unitWorks.has(action.work.workId))) {
              return problem(`${action.actionKey} names a Work its unit neither targets nor creates`, stage);
            }
            break;
          case 'CREATE_SERIES_ISSUE': {
            const { group, member } = action.membership;
            const key = `${group}|${member}`;

            if (
              unit.target.kind !== 'PLANNED_WORK' ||
              !isTarget(action.work) ||
              plan.series[group]?.members[member]?.workId !== action.work.workId
            ) {
              return problem(`${action.actionKey} names no Series membership the plan holds for its Work`, stage);
            }
            if (memberships.has(key)) return problem(`Series membership ${key} is created twice`, stage);

            memberships.add(key);
            break;
          }
          case 'CREATE_WORK_RELATION': {
            const edge = relations.get(action.relationKey);

            if (edge?.status !== 'PLANNED' || edge.relationOrdinal === null) {
              return problem(`relation ${action.relationKey} is not a planned relation the plan holds`, stage);
            }
            if (createdRelations.has(edge.key)) return problem(`relation ${edge.key} is created twice`, stage);

            // Every Work the relation names that the plan creates must exist by the time this unit creates it.
            if (
              [edge.relator, edge.related].some(
                (endpoint) => endpoint.kind === 'PLANNED_WORK' && !createdIn.has(endpoint.workId),
              )
            ) {
              return problem(`relation ${edge.key} names a Work no earlier action of the plan creates`, stage);
            }

            createdRelations.add(edge.key);
            break;
          }
          default:
            return problem('it holds an action no stage performs', 'noop');
        }
      }
    }

    // Exactly once: nothing the plan holds is left without the one action that performs it.
    const omission = (message: string): OnixPlanProblem => ({
      message: `This ONIX plan cannot be run as planned: ${message}. Nothing was created`,
      unit: undefined,
      stage: 'noop',
    });
    const unperformed = [...works.keys(), ...chapters.keys(), ...containedWorks.keys()].find(
      (id) => !createdIn.has(id),
    );

    if (unperformed !== undefined) return omission(`no execution unit creates its Work ${unperformed}`);

    for (const work of plan.works) {
      const missing = work.publications.findIndex((_publication, index) => !publications.has(`${work.id}|${index}`));

      if (missing >= 0) return omission(`no execution unit creates Publication ${missing + 1} of Work ${work.id}`);
    }

    for (const [group, { members }] of plan.series.entries()) {
      const missing = members.findIndex((_member, member) => !memberships.has(`${group}|${member}`));

      if (missing >= 0) return omission(`no execution unit creates Series membership ${group}|${missing}`);
    }

    const unrelated = [...relations.values()].find(
      ({ key, status }) => status === 'PLANNED' && !createdRelations.has(key),
    );

    if (unrelated !== undefined) return omission(`no execution unit creates the planned relation ${unrelated.key}`);

    return null;
  }

  /**
   * Runs a confirmed ONIX plan (thoth-app#187): its execution units, in source order, each performing exactly the
   * actions the plan assigned it, stage by stage, one mutation at a time. Nothing here reads the source, reruns a
   * reduction, chooses an identity, changes an ordinal or reassigns an action: the only thing execution learns is the
   * backend id each planned Work is created with, which every later action naming that Work is given.
   *
   * The file is not atomic. A unit counts as completed once every action it owns has returned, a unit with nothing to
   * do included. When an action fails the run stops: earlier units stay committed, later ones are never started, and
   * the failed unit's own writes are compensated - every Work it created deleted in reverse order of creation, its
   * top-level Work last, and every other write it made that those deletions would not remove deleted by the exact id it
   * returned. An existing Work is never deleted or changed. What the cleanup proved, or could not, travels with the
   * original error, which stays the error the run stopped with, and says whether the complete file may be tried again
   * through a fresh preflight or must be reconciled by hand first. The failed plan is never replayed.
   *
   * Every check that can be made before the first mutation is made before it: a plan that fails one sends nothing.
   */
  private async executeOnixPlan(plan: ImportPlan, observer?: ImportExecutionObserver) {
    const units = plan.execution?.units ?? [];
    const total = units.length;
    const problem = WorkService.validateOnixPlan(plan);

    if (problem !== null) {
      const unit = problem.unit ?? units[0];

      throw new ImportExecutionError(problem.message, {
        total,
        completed: 0,
        current: unit === undefined ? { position: 0, title: '', chapterCount: 0 } : WorkService.unitContext(unit),
        stage: problem.stage,
        cleanup: { status: 'NOT_REQUIRED', retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT' },
      });
    }

    const intents = new Map<WorkId, number[][]>();

    for (const { workId, ordinals } of plan.onix?.descriptive?.contributorIntents ?? []) {
      intents.set(workId, [...(intents.get(workId) ?? []), [...ordinals]]);
    }

    const run: OnixRun = {
      plan,
      works: new Map(plan.works.map((work) => [work.id, work])),
      chapters: new Map(plan.chapters.map((chapter) => [chapter.id, chapter])),
      containedWorks: new Map((plan.containedWorks ?? []).map((work) => [work.id, work])),
      relations: new Map((plan.relations ?? []).map((edge) => [edge.key, edge])),
      intents,
      counts: new Map((plan.onix?.descriptive?.statedCounts ?? []).map(({ workId, counts }) => [workId, counts])),
      resolved: new Map(),
      seriesIds: new Map(),
      // New for this run and owned by it, as for any bulk import: see ImportContributorRegistry.
      registry: new ImportContributorRegistry(),
    };

    let completed = 0;

    for (const unit of units) {
      const current = WorkService.unitContext(unit);
      const attempt = new ImportUnitAttempt();
      let stage: OnixImportExecutionStage | null = null;

      try {
        if (unit.actions.length === 0) {
          stage = 'noop';
          WorkService.reportProgress(observer, { total, completed, current, stage });
        }

        for (const action of unit.actions) {
          const actionStage = ONIX_ACTION_STAGES[action.kind];

          if (actionStage !== stage) {
            stage = actionStage;
            WorkService.reportProgress(observer, { total, completed, current, stage });
          }

          await this.executeOnixAction(action, run, attempt, actionStage);
        }
      } catch (error) {
        // The stage the unit failed at stays the failure's stage: the cleanup that follows is reported beside it.
        const cleanup = await this.compensateOnixUnit(attempt);

        throw new ImportExecutionError(
          extractErrorMessage(error),
          { total, completed, current, stage: stage ?? 'noop', cleanup },
          error,
        );
      }

      completed += 1;
    }
  }

  /** The backend id of a Work an action names: an existing Work's own, or the one a planned Work was created with. */
  private static resolveWork(ref: ImportWorkRef, run: OnixRun): WorkId {
    if (ref.kind === 'EXISTING_WORK') return ref.workId;

    const resolved = run.resolved.get(ref.workId);

    if (resolved === undefined) throw new Error(`The planned Work ${ref.workId} has not been created`);

    return resolved;
  }

  /**
   * One Work row of an ONIX unit (thoth-app#187): its Work, chapter or contained Work, journaled for cleanup the moment
   * the backend returns its id. Its Publications are never created here: their own actions create them.
   */
  private async createOnixWork(
    work: WorkEntity,
    actionKey: string,
    stage: OnixImportExecutionStage,
    run: OnixRun,
    attempt: ImportUnitAttempt,
  ): Promise<WorkId> {
    let known = false;
    let created: WorkEntity;

    attempt.issued = true;

    try {
      // A structural copy with no Publication, so the Work-creation path creates none: the plan's Work is left
      // untouched.
      created = await this.createWorkRow(
        { ...work, publications: [] },
        run.registry,
        run.intents.get(work.id) ?? [],
        run.counts.get(work.id) ?? {},
        (workId) => {
          known = true;
          attempt.record({ operation: 'DELETE_WORK', entityId: workId, actionKey, stage });
        },
      );
    } catch (error) {
      if (!known)
        attempt.unknownCreate(actionKey, stage, 'The Work creation request failed without returning a Work id');

      throw error;
    }

    run.resolved.set(work.id, created.id);

    return created.id;
  }

  /**
   * One child an ONIX unit creates under a Work (thoth-app#187). Under a Work the unit created, deleting that Work
   * removes it; under any other Work, it is journaled by the exact id its create returned, and a create that returned
   * none is unknown.
   */
  private async createOnixChild(
    workId: WorkId,
    operation: ImportCleanupRecord['operation'],
    actionKey: string,
    stage: OnixImportExecutionStage,
    attempt: ImportUnitAttempt,
    create: () => Promise<string | null | undefined>,
  ) {
    const covered = attempt.covers(workId);
    let createdId: string | null | undefined;

    attempt.issued = true;

    try {
      createdId = await create();
    } catch (error) {
      if (!covered) attempt.unknownCreate(actionKey, stage, 'The creation request failed without returning an id');

      throw error;
    }

    if (covered) return;

    if (typeof createdId !== 'string' || createdId.length === 0) {
      attempt.unknownCreate(actionKey, stage, 'The creation returned no id');

      throw new Error('A creation returned no id, so whether it was created is not known');
    }

    attempt.record({ operation, entityId: createdId, actionKey, stage });
  }

  /** Performs one action of a confirmed ONIX plan, exactly as the plan holds it (thoth-app#187). */
  private async executeOnixAction(
    action: ImportExecutionAction,
    run: OnixRun,
    attempt: ImportUnitAttempt,
    stage: OnixImportExecutionStage,
  ) {
    switch (action.kind) {
      case 'CREATE_WORK': {
        await this.createOnixWork(run.works.get(action.workId) as WorkEntity, action.actionKey, stage, run, attempt);

        return;
      }
      case 'CREATE_PUBLICATION': {
        const workId = WorkService.resolveWork(action.work, run);
        const covered = attempt.covers(workId);
        const publication =
          action.publication.source === 'WORK'
            ? (run.works.get(action.work.workId) as WorkEntity).publications[action.publication.index]
            : action.publication.publication;
        let publicationId: string | null = null;

        attempt.issued = true;

        try {
          await this.publicationService.createImportPublication(publication, workId, (createdId) => {
            publicationId = createdId;

            if (!covered) {
              attempt.record({
                operation: 'DELETE_PUBLICATION',
                entityId: createdId,
                actionKey: action.actionKey,
                stage,
              });
            }
          });
        } catch (error) {
          if (publicationId === null && !covered) {
            attempt.unknownCreate(
              action.actionKey,
              stage,
              'The Publication creation request failed without returning an id',
            );
          }

          throw error;
        }

        return;
      }
      case 'CREATE_CHAPTER':
      case 'CREATE_CONTAINED_WORK': {
        const parentId = WorkService.resolveWork(action.parent, run);
        const child = (action.kind === 'CREATE_CHAPTER' ? run.chapters : run.containedWorks).get(action.workId);
        const childId = await this.createOnixWork(child as WorkEntity, action.actionKey, stage, run, attempt);

        // Complete only once its exact relation exists; were it to fail, the child is journaled and is deleted.
        await this.createWorkRelation(
          childId,
          parentId,
          action.ordinal,
          action.kind === 'CREATE_CHAPTER' ? RelationType.IsChildOf : RelationType.IsPartOf,
        );

        return;
      }
      case 'CREATE_ADDITIONAL_RESOURCE': {
        const workId = WorkService.resolveWork(action.work, run);
        const { workResourceId: _, file: _file, ...dto } = new AdditionalResourceDtoMapper().toDto(action.resource);

        await this.createOnixChild(workId, 'DELETE_ADDITIONAL_RESOURCE', action.actionKey, stage, attempt, async () => {
          const response = await this.graphqlService.mutation(CREATE_ADDITIONAL_RESOURCE, {
            data: {
              ...dto,
              title: dto.title ?? '',
              resourceType: dto.resourceType as ResourceType,
              workId,
              resourceOrdinal: action.resource.orderNumber,
            },
            markupFormat: action.markupFormat,
          });

          return (response.createAdditionalResource as AdditionalResourceDto | null)?.workResourceId;
        });

        return;
      }
      case 'CREATE_BOOK_REVIEW': {
        const workId = WorkService.resolveWork(action.work, run);
        const { bookReviewId: _, ...dto } = new BookReviewDtoMapper().toDto(action.review);

        await this.createOnixChild(workId, 'DELETE_BOOK_REVIEW', action.actionKey, stage, attempt, async () => {
          const response = await this.graphqlService.mutation(CREATE_BOOK_REVIEW, {
            data: { ...dto, workId, reviewOrdinal: action.review.orderNumber },
            markupFormat: action.markupFormat,
          });

          return (response.createBookReview as BookReviewDto | null)?.bookReviewId;
        });

        return;
      }
      case 'CREATE_ENDORSEMENT': {
        const workId = WorkService.resolveWork(action.work, run);
        const { endorsementId: _, ...dto } = new EndorsementDtoMapper().toDto(action.endorsement);

        await this.createOnixChild(workId, 'DELETE_ENDORSEMENT', action.actionKey, stage, attempt, async () => {
          const response = await this.graphqlService.mutation(CREATE_ENDORSEMENT, {
            data: { ...dto, workId, endorsementOrdinal: action.endorsement.orderNumber },
            markupFormat: action.markupFormat,
          });

          return (response.createEndorsement as EndorsementDto | null)?.endorsementId;
        });

        return;
      }
      case 'CREATE_AWARD': {
        const workId = WorkService.resolveWork(action.work, run);
        const { awardId: _, ...dto } = new AwardDtoMapper().toDto(action.award);

        await this.createOnixChild(workId, 'DELETE_AWARD', action.actionKey, stage, attempt, async () => {
          const response = await this.graphqlService.mutation(CREATE_AWARD, {
            data: { ...dto, workId, awardOrdinal: action.award.orderNumber },
            markupFormat: action.markupFormat,
          });

          return (response.createAward as AwardDto | null)?.awardId;
        });

        return;
      }
      case 'CREATE_SERIES_ISSUE': {
        const workId = WorkService.resolveWork(action.work, run);
        const group = run.plan.series[action.membership.group];
        const { orderNumber, issueNumber } = group.members[action.membership.member];

        // A new Series is created the first time a unit needs it, and is reused by every later one: residue a failed
        // unit leaves is found again by a fresh preflight. The issue itself is removed with the Work it belongs to.
        attempt.issued = true;

        const seriesId = await this.resolveSeriesId(group, run.seriesIds);

        await this.seriesService.createIssue({
          orderNumber,
          seriesId,
          workId,
          ...(issueNumber === undefined ? {} : { issueNumber }),
        });

        return;
      }
      case 'CREATE_WORK_RELATION': {
        const edge = run.relations.get(action.relationKey) as ImportRelationEdge;
        const relatorId = WorkService.resolveWork(edge.relator, run);
        const relatedId = WorkService.resolveWork(edge.related, run);
        // A relation naming a Work this unit created is removed with that Work; any other is journaled by its own id.
        const coveringId = attempt.covers(relatorId) ? relatorId : relatedId;

        await this.createOnixChild(coveringId, 'DELETE_WORK_RELATION', action.actionKey, stage, attempt, async () => {
          const created = await this.createWorkRelation(
            relatorId,
            relatedId,
            edge.relationOrdinal as number,
            RELATION_TYPES[edge.relationType],
          );

          return created?.workRelationId;
        });

        return;
      }
      default:
        throw new Error('This ONIX plan holds an action no stage performs');
    }
  }

  /**
   * Deletes one write of a failed ONIX unit by the exact id its create returned, and hands back the id the delete
   * mutation returned: only that exact id proves the write gone.
   */
  private async deleteOnixWrite({ operation, entityId }: ImportCleanupRecord): Promise<string | null | undefined> {
    switch (operation) {
      case 'DELETE_WORK':
        return (await this.graphqlService.mutation(DELETE_WORK, { workId: entityId }))?.deleteWork?.workId;
      case 'DELETE_PUBLICATION':
        return (await this.publicationService.deletePublication(entityId))?.publicationId;
      case 'DELETE_WORK_RELATION':
        return (await this.graphqlService.mutation(DELETE_WORK_RELATION, { workRelationId: entityId }))
          ?.deleteWorkRelation?.workRelationId;
      case 'DELETE_ADDITIONAL_RESOURCE': {
        const response = await this.graphqlService.mutation(DELETE_ADDITIONAL_RESOURCE, {
          additionalResourceId: entityId,
        });

        return (response?.deleteAdditionalResource as AdditionalResourceDto | null)?.workResourceId;
      }
      case 'DELETE_BOOK_REVIEW': {
        const response = await this.graphqlService.mutation(DELETE_BOOK_REVIEW, { bookReviewId: entityId });

        return (response?.deleteBookReview as BookReviewDto | null)?.bookReviewId;
      }
      case 'DELETE_ENDORSEMENT':
        return (await this.graphqlService.mutation(DELETE_ENDORSEMENT, { endorsementId: entityId }))?.deleteEndorsement
          ?.endorsementId;
      case 'DELETE_AWARD': {
        const response = await this.graphqlService.mutation(DELETE_AWARD, { awardId: entityId });

        return (response?.deleteAward as AwardDto | null)?.awardId;
      }
      default:
        return null;
    }
  }

  /**
   * What became of a failed ONIX unit's own writes (thoth-app#187). Nothing sent, nothing to clean. Otherwise every
   * journaled write is deleted in reverse order of creation - every relation and child first, then each Work it
   * created, its top-level Work last - and each counts as removed only when its delete returned that exact id. A delete
   * that threw, returned another id or none, or a create whose outcome is unknown, leaves the cleanup unproven: the
   * file then needs reconciling by hand before it is tried again. Every delete is attempted whatever an earlier one
   * did, and none of it ever replaces the error the unit failed with. Contributors are never deleted: their residue is
   * accepted.
   */
  private async compensateOnixUnit(attempt: ImportUnitAttempt): Promise<ImportCleanupDisposition> {
    if (!attempt.issued) return { status: 'NOT_REQUIRED', retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT' };

    const compensated: ImportCleanupRecord[] = [];
    const failures: ImportCleanupFailure[] = [];

    for (const entry of [...attempt.entries].reverse()) {
      try {
        const returned = await this.deleteOnixWrite(entry);

        if (returned === entry.entityId) {
          compensated.push(entry);
        } else {
          failures.push({
            ...entry,
            reason:
              typeof returned === 'string' && returned.length > 0
                ? `The delete returned ${returned}, not the id it was asked to delete`
                : 'The delete returned no id',
          });
        }
      } catch (error) {
        failures.push({ ...entry, reason: extractErrorMessage(error) });
      }
    }

    failures.push(...attempt.unknown);

    return failures.length === 0
      ? { status: 'VERIFIED', retry: 'COMPLETE_FILE_AFTER_FRESH_PREFLIGHT', compensated }
      : { status: 'FAILED_OR_UNKNOWN', retry: 'MANUAL_RECONCILIATION_REQUIRED', compensated, failures };
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
