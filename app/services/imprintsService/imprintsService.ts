import { GET_IMPRINTS } from '@/app/queries';
import type { ImprintEntity } from '@/interfaces';
import { BaseService } from '@/interfaces/services';

import { ImprintDtoMapper } from './mappers';

export class ImprintsService extends BaseService {
  async getImprints(publishersIds: string[]): Promise<ImprintEntity[]> {
    const { data } = await this.queryClient({
      query: GET_IMPRINTS,
      variables: { publishers: publishersIds },
    });

    const dtoMapper = new ImprintDtoMapper();
    const res = data?.imprints.map(dtoMapper.toEntity);

    return res ?? [];
  }
}
