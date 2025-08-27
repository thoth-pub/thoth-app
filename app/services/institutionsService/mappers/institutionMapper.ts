import type { InstitutionDto, InstitutionEntity, ToEntity } from '@/interfaces';

export class InstitutionDtoMapper implements ToEntity<InstitutionEntity, InstitutionDto> {
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
