import type { BaseMapper } from '@/src/shared/interfaces';
import type { TitleDto, TitleEntity } from '@/src/shared/types';
import { emptyToNull } from '@/src/shared/utils/strings';
import { compileFullTitle } from '@/src/shared/utils/titles';

export class TitleDtoMapper implements BaseMapper<TitleEntity, TitleDto> {
  toEntity(dto: TitleDto): TitleEntity {
    const { titleId, canonical, localeCode, subtitle, title } = dto;

    const normalizedSubtitle = subtitle ?? '';

    return {
      id: titleId,
      canonical,
      fullTitle: compileFullTitle(title, normalizedSubtitle),
      localeCode,
      subtitle: normalizedSubtitle,
      title,
    };
  }

  toDto(entity: TitleEntity): TitleDto {
    const { id, canonical, localeCode, subtitle, title } = entity;

    return {
      titleId: id,
      canonical,
      fullTitle: compileFullTitle(title, subtitle),
      localeCode,
      subtitle: emptyToNull(subtitle),
      title,
    };
  }
}
