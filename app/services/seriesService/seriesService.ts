import { GET_SERIES } from '@/app/queries';
import type { PublisherId, SeriesEntity } from '@/interfaces';
import { BaseService } from '@/interfaces/services';

import { SeriesDtoMapper } from './mappers';

export class SeriesService extends BaseService {
  async getSeries(publishersIds: PublisherId[]): Promise<SeriesEntity[]> {
    const { data } = await this.queryClient({
      query: GET_SERIES,
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
