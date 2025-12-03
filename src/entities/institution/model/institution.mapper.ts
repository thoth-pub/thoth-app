import type { BaseMapper } from '@/src/shared/interfaces';

import type { InstitutionDto, InstitutionEntity } from './institution.types';
import { CountryCode } from '@/gql/graphql';

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

  toDto(entity: InstitutionEntity): InstitutionDto {
    const { id, name, doi, ror, countryCode, updatedAt } = entity;

    return {
      institutionId: id,
      institutionName: name,
      institutionDoi: doi,
      ror: ror ?? '',
      countryCode: countryCode as CountryCode,
      updatedAt,
    };
  }
}
