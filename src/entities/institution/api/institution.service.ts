import { appConfig } from '@/src/shared/config';
import { BaseService } from '@/src/shared/interfaces/services';

import { InstitutionDtoMapper } from '../model/institution.mapper';
import { GET_INSTITUTIONS, GET_INSTITUTIONS_COUNT } from '../model/institution.schema';
import type { InstitutionDto, InstitutionEntity } from '../model/institution.types';

const { itemsPerRequestLimit } = appConfig.data;

export class InstitutionService extends BaseService<InstitutionEntity, InstitutionDto> {
  constructor(token: string, mapper = new InstitutionDtoMapper()) {
    super(token, mapper);
  }

  async getInstitutionsCount(filter: string = ''): Promise<number> {
    const { institutionCount = 0 } = await this.graphqlService.query(GET_INSTITUTIONS_COUNT, {
      filter,
    });

    return institutionCount;
  }

  async getInstitutions(
    offset: number = 0,
    limit: number = itemsPerRequestLimit,
    filter: string = '',
  ): Promise<InstitutionEntity[]> {
    const { institutions = [] } = await this.graphqlService.query(GET_INSTITUTIONS, {
      query: GET_INSTITUTIONS,
      offset,
      limit,
      filter,
    });

    const res = institutions.map(this.dtoMapper.toEntity);

    return res;
  }
}
