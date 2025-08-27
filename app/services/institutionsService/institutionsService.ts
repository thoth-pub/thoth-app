import { GET_INSTITUTIONS } from '@/app/queries';
import type { InstitutionEntity } from '@/interfaces';
import { BaseService } from '@/interfaces/services';

import { InstitutionDtoMapper } from './mappers';

export class InstitutionsService extends BaseService {
  async getInstitutions(): Promise<InstitutionEntity[]> {
    const { data } = await this.queryClient({
      query: GET_INSTITUTIONS,
    });

    const dtoMapper = new InstitutionDtoMapper();
    const res = data?.institutions.map(dtoMapper.toEntity);

    return res ?? [];
  }
}
