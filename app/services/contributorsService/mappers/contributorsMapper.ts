import type { ContributorDto, ContributorEntity, ToEntity } from '@/interfaces';

export class ContributorsDtoMapper implements ToEntity<ContributorEntity, ContributorDto> {
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
