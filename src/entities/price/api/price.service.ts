import { BaseService } from '@/src/shared/interfaces/services';
import { PriceDtoMapper } from '../model/price.mapper';
import { CurrencyCode, PriceDto, PriceEntity } from '../model/price.types';
import { QueryToken } from '@/src/shared';
import { PublicationId } from '../../publication/model/publication.types';
import { CREATE_PRICE, DELETE_PRICE, UPDATE_PRICE } from '../model/price.schema';

export class PriceService extends BaseService<PriceEntity, PriceDto> {
  constructor(mapper = new PriceDtoMapper()) {
    super(mapper);
  }

  async createPrice(token: QueryToken, data: PriceEntity, publicationId: PublicationId): Promise<PriceEntity> {
    const { priceId: _, ...dto } = this.dtoMapper.toDto(data);

    const response = await this.graphqlService.mutation(token, CREATE_PRICE, {
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

  async updatePrice(token: QueryToken, data: PriceEntity, publicationId: PublicationId): Promise<PriceEntity> {
    const dto = this.dtoMapper.toDto(data);

    await this.graphqlService.mutation(token, UPDATE_PRICE, {
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

  async deletePrice(token: QueryToken, priceId: string): Promise<void> {
    await this.graphqlService.mutation(token, DELETE_PRICE, {
      priceId,
    });
  }
}
