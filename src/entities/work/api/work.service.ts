import { WorkDtoMapper } from '../model/work.mapper';
import {
  CREATE_WORK_RELATION,
  DELETE_WORK,
  GET_WORK,
  GET_WORK_CHAPTERS,
  GET_WORKS,
  GET_WORKS_COUNT,
  UPDATE_WORK,
} from '../model/work.schema';
import type { WorkDto, WorkEntity, WorkId } from '../model/work.types';
import { CREATE_WORK } from '../model/work.mutations';
import { BaseService } from '@/src/shared/interfaces/services';
import { Direction, RelationType, WorkField, WorkStatus, WorkType } from '@/gql/graphql';
import { FundingService } from '../../funding/api/funding.service';
import { SubjectService } from '../../subject/api/subject.service';
import { ContributionService } from '../../contribution/api/contribution.service';
import { PublisherId } from '../../publisher/model/publisher.types';

export class WorkService extends BaseService<WorkEntity, WorkDto> {
  private readonly fundingService: FundingService;
  private readonly subjectService: SubjectService;
  private readonly contributionService: ContributionService;

  constructor(
    mapper = new WorkDtoMapper(),
    fundingService = new FundingService(),
    subjectService = new SubjectService(),
    contributionService = new ContributionService(),
  ) {
    super(mapper);
    this.fundingService = fundingService;
    this.subjectService = subjectService;
    this.contributionService = contributionService;
  }

  async createWork(token: string, data: WorkEntity): Promise<WorkEntity> {
    const { workId: _, ...dto } = this.dtoMapper.toDto(data) as WorkDto;

    const shouldCreateSubjects = data.subjects.length > 0;
    const shouldCreateContributions = data.contributions.length > 0;
    const shouldCreateFundings = data.fundings.length > 0;

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

    return work;
  }

  async createWorkRelation(token: string, chapterId: WorkId, relatedWorkId: WorkId, ordinal: number) {
    const response = await this.graphqlService.mutation(token, CREATE_WORK_RELATION, {
      data: {
        relatorWorkId: chapterId,
        relatedWorkId: relatedWorkId,
        relationOrdinal: ordinal,
        relationType: RelationType.IsChildOf,
      },
    });

    return response.createWorkRelation;
  }

  createChapter = async (token: string, chapter: WorkEntity, relatedWorkId: WorkId, ordinal: number) => {
    const createdChapter = await this.createWork(token, chapter);

    await this.createWorkRelation(token, createdChapter.id, relatedWorkId, ordinal);

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

      const chapters = relations.map((relation) => this.dtoMapper.toEntity(relation.relatedWork as WorkDto));
      allChapters.push(...chapters);

      fetchedCount = relations.length;
      offset += this.limit;
    } while (fetchedCount === this.limit);

    return allChapters;
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
}
