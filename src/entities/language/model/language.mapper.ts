import { BaseMapper } from '@/src/shared/interfaces';

import type { LanguageDto, LanguageEntity } from './language.types';

export class LanguageDtoMapper implements BaseMapper<LanguageEntity, LanguageDto> {
  toEntity(dto: LanguageDto): LanguageEntity {
    const { languageId, languageCode, languageRelation } = dto;

    return {
      id: languageId,
      code: languageCode,
      relation: languageRelation,
    };
  }

  toDto(entity: LanguageEntity): LanguageDto {
    const { id, code, relation } = entity;

    return {
      languageId: id,
      languageCode: code,
      languageRelation: relation,
    };
  }
}
