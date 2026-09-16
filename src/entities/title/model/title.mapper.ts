import type { BaseMapper } from '@/src/shared/interfaces';
import type { PlannedTitleEntity, TitleDto, TitleEntity } from '@/src/shared/types';
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

  toDto(entity: TitleEntity | PlannedTitleEntity): TitleDto {
    const { id, canonical, localeCode, subtitle, title } = entity;

    return {
      titleId: id,
      canonical,
      // An imported title's full title is its plan's - a source title statement, say - and is sent as planned.
      fullTitle: 'sourceMarkupFormat' in entity ? entity.fullTitle : compileFullTitle(title, subtitle),
      localeCode,
      subtitle: emptyToNull(subtitle),
      title,
    };
  }
}
