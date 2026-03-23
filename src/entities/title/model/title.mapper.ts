import type { BaseMapper } from '@/src/shared/interfaces';
import type { TitleDto, TitleEntity } from '@/src/shared/types';
import { emptyToNull } from '@/src/shared/utils/strings';

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
      subtitle: emptyToNull(subtitle),
      title,
    };
  }
}
