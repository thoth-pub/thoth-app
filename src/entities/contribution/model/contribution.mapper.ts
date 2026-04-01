import { BiographyDto, BiographyEntity } from './contribution.types';

export class BiographyDtoMapper {
  toEntity(dto: BiographyDto): BiographyEntity {
    const { biographyId, canonical, content, localeCode, contributionId } = dto;

    return { id: biographyId, canonical, content, localeCode, contributionId };
  }

  toDto(entity: BiographyEntity): BiographyDto {
    const { id, canonical, content, localeCode, contributionId } = entity;

    return { biographyId: id, canonical, content, localeCode, contributionId };
  }
}
