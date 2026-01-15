import { MarkupFormat, WorkField } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { appConfig, Direction, QueryToken } from '@/src/shared';
import { BaseService } from '@/src/shared/interfaces/services';

import { WorkService } from '../../work/api/work.service';
import { SetDtoMapper } from '../model/set.mapper';
import { CREATE_SET, DELETE_SET, UPDATE_SET } from '../model/set.mutations';
import { GET_SET, GET_SETS, GET_SETS_COUNT } from '../model/set.schema';
import { SetDto, SetEntity, SetId } from '../model/set.types';

export class SetService extends BaseService<SetEntity, SetDto> {
  private readonly workService: WorkService;

  constructor(mapper = new SetDtoMapper(), workService = new WorkService()) {
    super(mapper);
    this.workService = workService;
  }

  async getSets({
    publishersIds,
    offset,
    limit,
    filter,
    direction,
    field,
    markupFormat,
  }: {
    publishersIds: PublisherId[];
    offset?: number;
    limit?: number;
    direction?: Direction;
    filter?: string;
    field?: WorkField;
    markupFormat?: MarkupFormat;
  }): Promise<SetEntity[]> {
    const { works = [] } = await this.graphqlService.query(GET_SETS, {
      publishers: publishersIds,
      offset,
      limit,
      direction,
      filter,
      field,
      markupFormat,
    });

    const res = works.map((work) => this.dtoMapper.toEntity(work as SetDto));

    return res;
  }

  async getSet(setId: SetId): Promise<SetEntity> {
    const { work } = await this.graphqlService.query(GET_SET, {
      workId: setId,
    });

    return this.dtoMapper.toEntity(work as SetDto);
  }

  async getSetsCount(publishersIds: PublisherId[]): Promise<number> {
    const { workCount = 0 } = await this.graphqlService.query(GET_SETS_COUNT, {
      query: GET_SETS_COUNT,
      publishers: publishersIds,
    });

    return workCount;
  }

  async getAllSets({
    publishersIds,
    limit = appConfig.data.itemsPerRequestLimit,
  }: {
    publishersIds: PublisherId[];
    limit?: number;
  }): Promise<SetEntity[]> {
    const maxSetsCount = await this.getSetsCount(publishersIds);
    let offset = 0;
    const sets = [];

    do {
      const data = await this.getSets({ publishersIds, offset, limit });
      sets.push(...data);
      offset += limit;
    } while (offset < maxSetsCount);

    return sets;
  }

  async createSet(token: QueryToken, data: SetEntity, markupFormat: MarkupFormat): Promise<SetEntity> {
    const { workId: _workId, titles: _titles, updatedAt: _updatedAt, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(token, CREATE_SET, {
      data: dto as SetDto,
    });

    const work = this.dtoMapper.toEntity(response.createWork as SetDto);

    const promises = [];

    for (const title of data.titles) {
      promises.push(this.workService.createTitle(token, title, work.id, markupFormat));
    }

    const createdTitles = await Promise.all(promises);

    work.titles = createdTitles;

    return work;
  }

  async updateSet(token: QueryToken, data: SetEntity): Promise<SetEntity> {
    const { updatedAt: _updatedAt, titles: _titles, ...dto } = this.dtoMapper.toDto(data) as SetDto;

    const response = await this.graphqlService.mutation(token, UPDATE_SET, {
      data: dto,
    });

    const set = this.dtoMapper.toEntity(response.updateWork as SetDto);

    return set;
  }

  async deleteSet(token: QueryToken, setId: SetId): Promise<void> {
    await this.graphqlService.mutation(token, DELETE_SET, {
      workId: setId,
    });
  }
}
