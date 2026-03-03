import type { BaseMapper } from '@/src/shared/interfaces';
import type { TitleDto, TitleEntity } from '@/src/shared/types';

export class TitleDtoMapper implements BaseMapper<TitleEntity, TitleDto> {
  toEntity(dto: TitleDto): TitleEntity {
    const { titleId, canonical, fullTitle, localeCode, subtitle, title } = dto;

    return {
      id: titleId,
      canonical,
      fullTitle,
      localeCode,
      subtitle: subtitle ?? '',
      title,
    };
  }

  toDto(entity: TitleEntity): TitleDto {
    const { id, canonical, fullTitle, localeCode, subtitle, title } = entity;

    return {
      titleId: id,
      canonical,
      fullTitle,
      localeCode,
      subtitle: subtitle.length > 0 ? subtitle : null,
      title,
    };
  }
}
