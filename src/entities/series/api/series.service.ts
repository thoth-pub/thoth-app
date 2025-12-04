import { PublisherId } from '@/src/entities/publisher';
import { BaseService } from '@/src/shared/interfaces/services';
import { SeriesType as SeriesTypeEnum } from '@/gql/graphql';

import { SeriesDtoMapper } from '../model/series.mapper';
import {
  CREATE_SERIES,
  DELETE_SERIES,
  GET_SERIES,
  GET_SERIESES,
  GET_SERIESES_COUNT,
  UPDATE_SERIES,
} from '../model/series.schema';
import type { SeriesDto, SeriesEntity } from '../model/series.types';
import { appConfig, Direction, SeriesType } from '@/src/shared';
import { SeriesField } from '@/gql/graphql';

export class SeriesService extends BaseService<SeriesEntity, SeriesDto> {
  constructor(mapper = new SeriesDtoMapper()) {
    super(mapper);
  }

  async getSeries(seriesId: string): Promise<SeriesEntity> {
    const { series } = await this.graphqlService.query(GET_SERIES, {
      seriesId,
    });

    const data = this.dtoMapper.toEntity(series);

    return data;
  }

  async getSerieses({
    publishersIds,
    offset,
    limit,
    filter,
    direction,
    field,
    seriesType,
  }: {
    publishersIds: PublisherId[];
    offset?: number;
    limit?: number;
    direction?: Direction;
    filter?: string;
    seriesType?: SeriesTypeEnum;
    field?: SeriesField;
  }): Promise<SeriesEntity[]> {
    const { serieses = [] } = await this.graphqlService.query(GET_SERIESES, {
      publishers: publishersIds,
      offset,
      limit,
      direction,
      filter,
      field,
      seriesType,
    });

    const res = serieses.map(this.dtoMapper.toEntity);

    return res;
  }

  async getSeriesCount(publishersIds: PublisherId[]): Promise<number> {
    const { seriesCount = 0 } = await this.graphqlService.query(GET_SERIESES_COUNT, {
      query: GET_SERIESES_COUNT,
      publishers: publishersIds,
    });

    return seriesCount;
  }

  async getAllSerieses({
    publishersIds,
    limit = appConfig.data.itemsPerRequestLimit,
  }: {
    publishersIds: PublisherId[];
    limit?: number;
  }): Promise<SeriesEntity[]> {
    const maxSeriesCount = await this.getSeriesCount(publishersIds);
    let offset = 0;
    const series = [];

    do {
      const data = await this.getSerieses({ publishersIds, offset, limit });
      series.push(...data);
      offset += limit;
    } while (offset < maxSeriesCount);

    return series;
  }

  async createSeries(token: string, data: SeriesEntity): Promise<SeriesEntity> {
    const { issues: _issues, seriesId: _seriesId, updatedAt: _updatedAt, ...dto } = this.dtoMapper.toDto(data);

    const { createSeries } = await this.graphqlService.mutation(token, CREATE_SERIES, {
      data: {
        ...dto,
        imprintId: dto.imprintId ?? '',
        seriesName: dto.seriesName ?? '',
        seriesType: dto.seriesType ?? SeriesType.enum.BookSeries,
      },
    });

    return { ...data, id: createSeries?.seriesId ?? '' };
  }

  async updateSeries(token: string, data: SeriesEntity): Promise<SeriesEntity> {
    const { updatedAt: _updatedAt, issues: _issues, ...dto } = this.dtoMapper.toDto(data);

    const { updateSeries } = await this.graphqlService.mutation(token, UPDATE_SERIES, {
      data: {
        ...dto,
        imprintId: dto.imprintId ?? '',
        seriesId: dto.seriesId ?? '',
        seriesName: dto.seriesName ?? '',
        seriesType: SeriesType.enum.BookSeries,
      },
    });

    const result = this.dtoMapper.toEntity(updateSeries as SeriesDto);

    return result;
  }

  async deleteSeries(token: string, seriesId: string): Promise<void> {
    await this.graphqlService.mutation(token, DELETE_SERIES, {
      seriesId,
    });
  }
}
