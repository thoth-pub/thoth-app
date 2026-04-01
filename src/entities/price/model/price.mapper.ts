import type { BaseMapper } from '@/src/shared/interfaces';

import type { PriceDto, PriceEntity } from './price.types';

export class PriceDtoMapper implements BaseMapper<PriceEntity, PriceDto> {
  toEntity(dto: PriceDto): PriceEntity {
    const { priceId, currencyCode, unitPrice } = dto;

    return {
      id: priceId,
      currencyCode,
      unitPrice,
    };
  }

  toDto(entity: PriceEntity): PriceDto {
    const { id, currencyCode, unitPrice } = entity;

    return { priceId: id, currencyCode, unitPrice };
  }
}
