import { BaseMapper } from '@/src/shared/interfaces';

import type { LanguageDto, LanguageEntity } from './language.types';

export class LanguageDtoMapper implements BaseMapper<LanguageEntity, LanguageDto> {
  toEntity(dto: LanguageDto): LanguageEntity {
    const { languageId, languageCode, languageRelation, mainLanguage } = dto;

    return {
      id: languageId,
      code: languageCode,
      relation: languageRelation,
      isMain: mainLanguage,
    };
  }

  toDto(entity: LanguageEntity): LanguageDto {
    const { id, code, relation, isMain } = entity;

    return {
      languageId: id,
      languageCode: code,
      languageRelation: relation,
      mainLanguage: isMain,
    };
  }
}
