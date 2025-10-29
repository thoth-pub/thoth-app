import { PublisherId } from '@/src/entities/publisher';
import { BaseService } from '@/src/shared/interfaces/services';

import { SeriesDtoMapper } from '../model/series.mapper';
import { GET_SERIESES } from '../model/series.schema';
import type { SeriesEntity } from '../model/series.types';

export class SeriesService extends BaseService {
  async getSeries(publishersIds: PublisherId[]): Promise<SeriesEntity[]> {
    const { data } = await this.queryClient({
      query: GET_SERIESES,
      variables: { publishers: publishersIds },
    });

    if (!data || !data.serieses) {
      return [];
    }

    const dtoMapper = new SeriesDtoMapper();
    const res = data.serieses.map(dtoMapper.toEntity);

    return res;
  }
}
