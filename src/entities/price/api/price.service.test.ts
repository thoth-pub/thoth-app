import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';

import { PriceDtoMapper } from '../model/price.mapper';
import type { PriceDto, PriceEntity } from '../model/price.types';
import { PriceService } from './price.service';

describe('PriceService', () => {
  let service: PriceService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: PriceDtoMapper;

  const createEntity = (overrides?: Partial<PriceEntity>): PriceEntity => ({
    id: faker.string.uuid(),
    currencyCode: 'GBP' as PriceEntity['currencyCode'],
    unitPrice: 29.99,
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new PriceDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: PriceEntity) => ({
      priceId: entity.id,
      currencyCode: entity.currencyCode,
      unitPrice: entity.unitPrice,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: PriceDto) => ({
      id: dto.priceId,
      currencyCode: dto.currencyCode,
      unitPrice: dto.unitPrice,
    }));

    service = new PriceService(mockGraphqlService, mockMapper);
  });

  describe('createPrice', () => {
    it('should call mutation with correct variables and return mapped entity', async () => {
      const entity = createEntity();
      const publicationId = faker.string.uuid();
      const createdId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createPrice: {
          priceId: createdId,
          currencyCode: entity.currencyCode,
          unitPrice: entity.unitPrice,
        },
      });

      const result = await service.createPrice(entity, publicationId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            publicationId,
            currencyCode: entity.currencyCode,
            unitPrice: entity.unitPrice,
          }),
        }),
      );
      expect(result.id).toBe(createdId);
    });

    it('should call toDto with the entity', async () => {
      const entity = createEntity();
      const publicationId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createPrice: { priceId: faker.string.uuid() },
      });

      await service.createPrice(entity, publicationId);

      expect(mockMapper.toDto).toHaveBeenCalledWith(entity);
    });
  });

  describe('updatePrice', () => {
    it('should include priceId in mutation variables', async () => {
      const entity = createEntity();
      const publicationId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updatePrice: {
          priceId: entity.id,
          currencyCode: entity.currencyCode,
          unitPrice: entity.unitPrice,
        },
      });

      const result = await service.updatePrice(entity, publicationId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            priceId: entity.id,
            publicationId,
          }),
        }),
      );
      expect(result).toEqual(entity);
    });
  });

  describe('deletePrice', () => {
    it('should call mutation with priceId', async () => {
      const priceId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deletePrice: { priceId },
      });

      await service.deletePrice(priceId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ priceId }),
      );
    });

    it('should throw when mutation fails', async () => {
      const priceId = faker.string.uuid();
      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'));

      const promise = service.deletePrice(priceId);

      await expect(promise).rejects.toThrow('Delete failed');
    });
  });
});
