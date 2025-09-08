import type { BaseMapper } from '@/src/shared/interfaces';

import type { ContributorDto, ContributorEntity } from './contributor.types';

export class ContributorDtoMapper implements BaseMapper<ContributorEntity, ContributorDto> {
  toEntity(dto: ContributorDto): ContributorEntity {
    const { contributorId, fullName, orcid, updatedAt } = dto;

    return {
      id: contributorId,
      name: fullName,
      orcid: orcid ?? '',
      updatedAt,
    };
  }
}
