import type { BaseMapper } from '@/src/shared/interfaces';

import type { AffiliationDto, AffiliationEntity } from './affiliation.types';

export class AffiliationDtoMapper implements BaseMapper<AffiliationEntity, AffiliationDto> {
  toEntity(dto: AffiliationDto): AffiliationEntity {
    const {
      contributionId,
      affiliationId,
      institutionId,
      affiliationOrdinal,
      position,
      institution: { institutionName, ror },
    } = dto;

    return {
      id: affiliationId,
      contributionId,
      institutionId,
      institutionName: institutionName,
      rorId: ror,
      position: position ?? '',
      orderNumber: affiliationOrdinal,
    };
  }
}
