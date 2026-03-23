import type { BaseMapper } from '@/src/shared/interfaces';
import { emptyToNull } from '@/src/shared/utils/strings';

import { AwardDto, AwardEntity } from './award.types';

export class AwardDtoMapper implements BaseMapper<AwardEntity, AwardDto> {
  toEntity(dto: AwardDto): AwardEntity {
    const { awardId, workId, title, url, category, role, prizeStatement, awardOrdinal } = dto;

    return {
      id: awardId,
      workId,
      title,
      url: url ?? '',
      category: category ?? '',
      statement: prizeStatement ?? '',
      role: role ?? null,
      orderNumber: awardOrdinal,
    };
  }

  toDto(entity: AwardEntity): AwardDto {
    const { id, workId, title, url, category, statement, role, orderNumber } = entity;

    return {
      awardId: id,
      workId,
      title,
      url: emptyToNull(url),
      category: emptyToNull(category),
      prizeStatement: emptyToNull(statement),
      role,
      awardOrdinal: orderNumber,
    };
  }
}
