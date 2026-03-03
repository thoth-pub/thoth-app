import type { QueryToken } from '@/src/shared/interfaces';
import { BaseService } from '@/src/shared/interfaces/services';

import { PublicationId } from '../../publication/model/publication.types';
import { PriceDtoMapper } from '../model/price.mapper';
import { CREATE_PRICE, DELETE_PRICE, UPDATE_PRICE } from '../model/price.schema';
import { CurrencyCode, PriceDto, PriceEntity } from '../model/price.types';

export class PriceService extends BaseService<PriceEntity, PriceDto> {
  constructor(token: QueryToken, mapper = new PriceDtoMapper()) {
    super(token, mapper);
  }

  async createPrice(data: PriceEntity, publicationId: PublicationId): Promise<PriceEntity> {
    const { priceId: _, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(CREATE_PRICE, {
      data: {
        ...dto,
        publicationId,
        currencyCode: dto.currencyCode as CurrencyCode,
        unitPrice: dto.unitPrice as number,
      },
    });

    const price = this.dtoMapper.toEntity(response.createPrice as PriceDto);

    return price;
  }

  async updatePrice(data: PriceEntity, publicationId: PublicationId): Promise<PriceEntity> {
    const dto = this.dtoMapper.toDto(data);

    await this.graphqlService.mutation(UPDATE_PRICE, {
      data: {
        ...dto,
        priceId: dto.priceId ?? '',
        publicationId,
        currencyCode: dto.currencyCode as CurrencyCode,
        unitPrice: dto.unitPrice as number,
      },
    });

    return data;
  }

  async deletePrice(priceId: string): Promise<void> {
    await this.graphqlService.mutation(DELETE_PRICE, {
      priceId,
    });
  }
}
