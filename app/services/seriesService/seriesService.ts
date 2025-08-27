import { GET_SERIES } from '@/app/queries';
import type { SeriesEntity } from '@/interfaces';
import { BaseService } from '@/interfaces/services';

import { SeriesDtoMapper } from './mappers';

export class SeriesService extends BaseService {
  async getSeries(publishersIds: string[]): Promise<SeriesEntity[]> {
    const { data } = await this.queryClient({
      query: GET_SERIES,
      variables: { publishers: publishersIds },
    });

    const dtoMapper = new SeriesDtoMapper();
    const res = data?.serieses.map(dtoMapper.toEntity);

    return res ?? [];
  }
}
