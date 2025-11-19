import { PublisherId } from '@/src/entities/publisher';
import { BaseService } from '@/src/shared/interfaces/services';

import { SeriesDtoMapper } from '../model/series.mapper';
import { GET_SERIESES, GET_SERIESES_COUNT } from '../model/series.schema';
import type { SeriesEntity } from '../model/series.types';
import { appConfig } from '@/src/shared';

export class SeriesService extends BaseService {
  async getSerieses(
    publishersIds: PublisherId[],
    offset: number = 0,
    limit: number = appConfig.data.itemsPerRequestLimit,
  ): Promise<SeriesEntity[]> {
    const { data } = await this.queryClient({
      query: GET_SERIESES,
      variables: { publishers: publishersIds, offset, limit },
    });

    if (!data || !data.serieses) {
      return [];
    }

    const dtoMapper = new SeriesDtoMapper();
    const res = data.serieses.map(dtoMapper.toEntity);

    return res;
  }

  async getSeriesCount(publishersIds: PublisherId[]): Promise<number> {
    const { data } = await this.queryClient({
      query: GET_SERIESES_COUNT,
      variables: { publishers: publishersIds },
    });

    if (!data || !data.seriesCount) {
      return 0;
    }

    return data.seriesCount;
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
      const data = await this.getSerieses(publishersIds, offset, limit);
      series.push(...data);
      offset += limit;
    } while (offset < maxSeriesCount);

    return series;
  }
}
