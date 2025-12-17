import { getBiographyMarkupFormat, type MarkdownFormat } from '@/src/shared';

import { BiographyDto, BiographyEntity } from './contribution.types';

export class BiographyDtoMapper {
  toEntity(dto: BiographyDto): BiographyEntity {
    const { biographyId, canonical, content, localeCode } = dto;

    return { id: biographyId, canonical, content, localeCode };
  }

  toDto(entity: BiographyEntity): { dto: BiographyDto; markupFormat: MarkdownFormat } {
    const { id, canonical, content, localeCode } = entity;
    const markupFormat = getBiographyMarkupFormat(entity);

    return { dto: { biographyId: id, canonical, content, localeCode }, markupFormat };
  }
}
