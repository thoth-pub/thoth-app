import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';

import { AffiliationDtoMapper } from '../model/affiliation.mapper';
import type { AffiliationDto, AffiliationEntity } from '../model/affiliation.types';
import { AffiliationService } from './affiliation.service';

describe('AffiliationService', () => {
  let service: AffiliationService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: AffiliationDtoMapper;

  const createEntity = (overrides?: Partial<AffiliationEntity>): AffiliationEntity => ({
    id: faker.string.uuid(),
    contributionId: faker.string.uuid(),
    institutionId: faker.string.uuid(),
    institutionName: 'Test University',
    rorId: 'https://ror.org/test',
    position: 'Professor',
    orderNumber: 1,
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new AffiliationDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: AffiliationEntity) => ({
      contributionId: entity.contributionId,
      affiliationId: entity.id,
      institutionId: entity.institutionId,
      position: entity.position,
      affiliationOrdinal: entity.orderNumber,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: AffiliationDto) => ({
      id: dto.affiliationId,
      contributionId: dto.contributionId,
      institutionId: dto.institutionId,
      institutionName: dto.institution?.institutionName ?? '',
      rorId: dto.institution?.ror ?? '',
      position: dto.position ?? '',
      orderNumber: dto.affiliationOrdinal,
    }));

    service = new AffiliationService(mockGraphqlService, mockMapper);
  });

  describe('createAffiliation', () => {
    it('should call mutation with correct variables', async () => {
      const entity = createEntity();
      const createdId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createAffiliation: { affiliationId: createdId },
      });

      const result = await service.createAffiliation(entity);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            contributionId: entity.contributionId,
            institutionId: entity.institutionId,
            affiliationOrdinal: entity.orderNumber,
            position: entity.position,
          }),
        }),
      );
      expect(result.id).toBe(createdId);
    });

    it('should default affiliationOrdinal to 1 when orderNumber is undefined', async () => {
      const entity = createEntity({ orderNumber: undefined as unknown as number });

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createAffiliation: { affiliationId: faker.string.uuid() },
      });

      await service.createAffiliation(entity);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ affiliationOrdinal: 1 }),
        }),
      );
    });
  });

  describe('updateAffiliation', () => {
    it('should include affiliationId in mutation variables', async () => {
      const entity = createEntity();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateAffiliation: { affiliationId: entity.id },
      });

      const result = await service.updateAffiliation(entity);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            affiliationId: entity.id,
            contributionId: entity.contributionId,
            institutionId: entity.institutionId,
          }),
        }),
      );
      expect(result.id).toBe(entity.id);
    });
  });

  describe('deleteAffiliation', () => {
    it('should call mutation with affiliationId', async () => {
      const affiliationId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deleteAffiliation: { affiliationId },
      });

      const result = await service.deleteAffiliation(affiliationId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ affiliationId }),
      );
      expect(result).toEqual({ affiliationId });
    });

    it('should throw when mutation fails', async () => {
      const affiliationId = faker.string.uuid();
      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'));

      const promise = service.deleteAffiliation(affiliationId);

      await expect(promise).rejects.toThrow('Delete failed');
    });
  });

  describe('moveAffiliation', () => {
    it('should call mutation with affiliationId and newOrdinal', async () => {
      const affiliationId = faker.string.uuid();
      const newOrdinal = 3;

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        moveAffiliation: { affiliationId, affiliationOrdinal: newOrdinal },
      });

      const result = await service.moveAffiliation({ affiliationId, newOrdinal });

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ affiliationId, newOrdinal }),
      );
      expect(result).toEqual({ moveAffiliation: { affiliationId, affiliationOrdinal: newOrdinal } });
    });
  });
});
