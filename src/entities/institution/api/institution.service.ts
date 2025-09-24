import { appConfig } from '@/src/shared/config';
import { BaseService } from '@/src/shared/interfaces/services';

import { InstitutionDtoMapper } from '../model/institution.mapper';
import { GET_INSTITUTIONS, GET_INSTITUTIONS_COUNT } from '../model/institution.schema';
import type { InstitutionEntity } from '../model/institution.types';

const { itemsPerRequestLimit, maxItemsPerRequestLimit } = appConfig.data;

export class InstitutionService extends BaseService {
  async getInstitutionsCount(): Promise<number> {
    const { data } = await this.queryClient({
      query: GET_INSTITUTIONS_COUNT,
    });

    return data?.institutionCount ?? 0;
  }

  async getInstitutions(offset: number = 0, limit: number = itemsPerRequestLimit): Promise<InstitutionEntity[]> {
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

  async getAllInstitutions(limit: number = maxItemsPerRequestLimit): Promise<InstitutionEntity[]> {
    const maxInstitutionsCount = await this.getInstitutionsCount();
    let offset = 0;
    const institutions = [];

    do {
      const data = await this.getInstitutions(offset, limit);
      institutions.push(...data);
      offset += limit;
    } while (offset < maxInstitutionsCount);

    return institutions;
  }
}
