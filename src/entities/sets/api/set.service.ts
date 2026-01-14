import { WorkField } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { appConfig, Direction } from '@/src/shared';
import { BaseService } from '@/src/shared/interfaces/services';

import { SetDtoMapper } from '../model/set.mapper';
import { GET_SETS, GET_SETS_COUNT } from '../model/set.schema';
import { SetDto, SetEntity } from '../model/set.types';

export class SetsService extends BaseService<SetEntity, SetDto> {
  constructor(mapper = new SetDtoMapper()) {
    super(mapper);
  }

  async getSets({
    publishersIds,
    offset,
    limit,
    filter,
    direction,
    field,
  }: {
    publishersIds: PublisherId[];
    offset?: number;
    limit?: number;
    direction?: Direction;
    filter?: string;
    field?: WorkField;
  }): Promise<SetEntity[]> {
    const { works = [] } = await this.graphqlService.query(GET_SETS, {
      publishers: publishersIds,
      offset,
      limit,
      direction,
      filter,
      field,
    });

    const res = works.map((work) => this.dtoMapper.toEntity(work as SetDto));

    return res;
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

  // async createSeries(token: string, data: SeriesEntity): Promise<SeriesEntity> {
  //   const { issues: _issues, seriesId: _seriesId, updatedAt: _updatedAt, ...dto } = this.dtoMapper.toDto(data);

  //   const { createSeries } = await this.graphqlService.mutation(token, CREATE_SERIES, {
  //     data: {
  //       ...dto,
  //       imprintId: dto.imprintId ?? '',
  //       seriesName: dto.seriesName ?? '',
  //       seriesType: dto.seriesType ?? SeriesType.enum.BookSeries,
  //     },
  //   });

  //   return { ...data, id: createSeries?.seriesId ?? '' };
  // }

  // async updateSeries(token: string, data: SeriesEntity): Promise<SeriesEntity> {
  //   const { updatedAt: _updatedAt, issues: _issues, ...dto } = this.dtoMapper.toDto(data);

  //   await this.graphqlService.mutation(token, UPDATE_SERIES, {
  //     data: {
  //       ...dto,
  //       imprintId: dto.imprintId ?? '',
  //       seriesId: dto.seriesId ?? '',
  //       seriesName: dto.seriesName ?? '',
  //       seriesType: SeriesType.enum.BookSeries,
  //     },
  //   });

  //   return data;
  // }

  // async deleteSeries(token: string, seriesId: string): Promise<void> {
  //   await this.graphqlService.mutation(token, DELETE_SERIES, {
  //     seriesId,
  //   });
  // }
}
