import { GET_INSTITUTIONS, GET_INSTITUTIONS_COUNT } from '@/app/queries';
import { config } from '@/config';
import type { InstitutionEntity } from '@/interfaces';
import { BaseService } from '@/interfaces/services';

import { InstitutionDtoMapper } from './mappers';

const defaultLimit = config.data.itemsPerRequestLimit;

export class InstitutionsService extends BaseService {
  async getInstitutionsCount(): Promise<number> {
    const { data } = await this.queryClient({
      query: GET_INSTITUTIONS_COUNT,
    });

    return data?.institutionCount ?? 0;
  }

  async getInstitutions(offset: number = 0, limit: number = defaultLimit): Promise<InstitutionEntity[]> {
    const { data } = await this.queryClient({
      query: GET_INSTITUTIONS,
      variables: {
        offset,
        limit,
      },
    });

    if (!data || !data.institutions) {
      return [];
    }

    const dtoMapper = new InstitutionDtoMapper();
    const res = data.institutions.map(dtoMapper.toEntity);

    return res;
  }
}
