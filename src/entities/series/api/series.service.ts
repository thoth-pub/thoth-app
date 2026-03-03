import { SeriesField, SeriesType as SeriesTypeEnum } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { GraphqlService } from '@/src/shared/api/graphqlService';
import { appConfig } from '@/src/shared/config';
import { SeriesType } from '@/src/shared/constants';
import { BaseService } from '@/src/shared/interfaces/services';
import { Direction } from '@/src/shared/types';

import { WorkId } from '../../work/model/work.types';
import { SeriesDtoMapper } from '../model/series.mapper';
import {
  CREATE_ISSUE,
  CREATE_SERIES,
  DELETE_ISSUE,
  DELETE_SERIES,
  MOVE_ISSUE,
  UPDATE_ISSUE,
  UPDATE_SERIES,
} from '../model/series.mutations';
import { GET_SERIES, GET_SERIESES, GET_SERIESES_COUNT } from '../model/series.schema';
import type { SeriesDto, SeriesEntity, SeriesId } from '../model/series.types';

export class SeriesService extends BaseService<SeriesEntity, SeriesDto> {
  constructor(graphqlService: GraphqlService, mapper = new SeriesDtoMapper()) {
    super(graphqlService, mapper);
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
      seriesTypes: seriesType ? [seriesType] : [],
    });

    const res = serieses.map(this.dtoMapper.toEntity);

    return res;
  }

  async getSeriesCount({ publishersIds, filter }: { publishersIds: PublisherId[]; filter?: string }): Promise<number> {
    const { seriesCount = 0 } = await this.graphqlService.query(GET_SERIESES_COUNT, {
      publishers: publishersIds,
      filter,
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
    const maxSeriesCount = await this.getSeriesCount({ publishersIds });
    let offset = 0;
    const series = [];

    do {
      const data = await this.getSerieses({ publishersIds, offset, limit });
      series.push(...data);
      offset += limit;
    } while (offset < maxSeriesCount);

    return series;
  }

  async createSeries(data: SeriesEntity): Promise<SeriesEntity> {
    const { issues: _issues, seriesId: _seriesId, updatedAt: _updatedAt, ...dto } = this.dtoMapper.toDto(data);

    const { createSeries } = await this.graphqlService.mutation(CREATE_SERIES, {
      data: {
        ...dto,
        imprintId: dto.imprintId ?? '',
        seriesName: dto.seriesName ?? '',
        seriesType: dto.seriesType ?? SeriesType.enum.BookSeries,
      },
    });

    return { ...data, id: createSeries?.seriesId ?? '' };
  }

  async updateSeries(data: SeriesEntity): Promise<SeriesEntity> {
    const { updatedAt: _updatedAt, issues: _issues, ...dto } = this.dtoMapper.toDto(data);

    await this.graphqlService.mutation(UPDATE_SERIES, {
      data: {
        ...dto,
        imprintId: dto.imprintId ?? '',
        seriesId: dto.seriesId ?? '',
        seriesName: dto.seriesName ?? '',
        seriesType: dto.seriesType ?? SeriesType.enum.BookSeries,
      },
    });

    return data;
  }

  async deleteSeries(seriesId: string): Promise<void> {
    await this.graphqlService.mutation(DELETE_SERIES, {
      seriesId,
    });
  }

  async createIssue({ orderNumber, seriesId, workId }: { orderNumber: number; seriesId: SeriesId; workId: WorkId }) {
    const { createIssue } = await this.graphqlService.mutation(CREATE_ISSUE, {
      data: {
        issueOrdinal: orderNumber,
        seriesId,
        workId,
      },
    });

    return createIssue;
  }

  async updateIssue({
    issueId,
    orderNumber,
    seriesId,
    workId,
  }: {
    issueId: string;
    orderNumber: number;
    seriesId: SeriesId;
    workId: WorkId;
  }) {
    const { updateIssue } = await this.graphqlService.mutation(UPDATE_ISSUE, {
      data: {
        issueId,
        issueOrdinal: orderNumber,
        seriesId,
        workId,
      },
    });

    return updateIssue;
  }

  async deleteIssue(issueId: string): Promise<void> {
    await this.graphqlService.mutation(DELETE_ISSUE, {
      issueId,
    });
  }

  async moveIssue(issueId: string, newOrdinal: number): Promise<void> {
    await this.graphqlService.mutation(MOVE_ISSUE, {
      issueId,
      newOrdinal,
    });
  }
}
