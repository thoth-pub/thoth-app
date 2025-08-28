import type { BaseMapper, ContributorDto, ContributorEntity } from '@/interfaces';

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
