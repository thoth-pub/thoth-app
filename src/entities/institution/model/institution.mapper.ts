import type { BaseMapper } from '@/src/shared/interfaces';

import type { InstitutionDto, InstitutionEntity } from './institution.types';

export class InstitutionDtoMapper implements BaseMapper<InstitutionEntity, InstitutionDto> {
  toEntity(dto: InstitutionDto): InstitutionEntity {
    const { institutionId, institutionName, institutionDoi, ror, countryCode, updatedAt } = dto;

    return {
      id: institutionId,
      name: institutionName,
      doi: institutionDoi,
      ror: ror ?? '',
      countryCode: countryCode ?? '',
      updatedAt,
    };
  }
}
