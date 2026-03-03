import type { BaseMapper } from '@/src/shared/interfaces';
import type { AbstractDto, AbstractEntity } from '@/src/shared/types';

export class AbstractDtoMapper implements BaseMapper<AbstractEntity, AbstractDto> {
  toEntity(dto: AbstractDto): AbstractEntity {
    const { abstractId, abstractType, canonical, content, localeCode } = dto;

    return {
      id: abstractId,
      type: abstractType,
      canonical,
      content,
      localeCode,
    };
  }

  toDto(entity: AbstractEntity): AbstractDto {
    const { id, type, canonical, content, localeCode } = entity;

    return {
      abstractId: id,
      abstractType: type,
      canonical,
      content,
      localeCode,
    };
  }
}
