import type { BaseMapper } from '@/src/shared/interfaces';

import { AwardDto, AwardEntity } from './award.types';

export class AwardDtoMapper implements BaseMapper<AwardEntity, AwardDto> {
  toEntity(dto: AwardDto): AwardEntity {
    const { awardId, workId, title, url, category, note, awardOrdinal } = dto;

    return {
      id: awardId,
      workId,
      title,
      url: url ?? '',
      category: category ?? '',
      note: note ?? '',
      orderNumber: awardOrdinal,
    };
  }

  toDto(entity: AwardEntity): AwardDto {
    const { id, workId, title, url, category, note, orderNumber } = entity;

    return {
      awardId: id,
      workId,
      title,
      url: url && url.length > 0 ? url : null,
      category: category && category.length > 0 ? category : null,
      note: note && note.length > 0 ? note : null,
      awardOrdinal: orderNumber,
    };
  }
}
