import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';

import { LocationDtoMapper } from '../model/location.mapper';
import type { LocationDto, LocationEntity } from '../model/location.types';
import { LocationService } from './location.service';

describe('LocationService', () => {
  let service: LocationService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: LocationDtoMapper;

  const createEntity = (overrides?: Partial<LocationEntity>): LocationEntity => ({
    id: faker.string.uuid(),
    canonical: true,
    fullTextUrl: 'https://example.com/fulltext',
    landingPage: 'https://example.com',
    locationPlatform: 'PAPER' as LocationEntity['locationPlatform'],
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new LocationDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: LocationEntity) => ({
      locationId: entity.id,
      canonical: entity.canonical,
      fullTextUrl: entity.fullTextUrl,
      landingPage: entity.landingPage,
      locationPlatform: entity.locationPlatform,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: LocationDto) => ({
      id: dto.locationId,
      canonical: dto.canonical,
      fullTextUrl: dto.fullTextUrl ?? '',
      landingPage: dto.landingPage ?? '',
      locationPlatform: dto.locationPlatform,
    }));

    service = new LocationService(mockGraphqlService, mockMapper);
  });

  describe('createLocation', () => {
    it('should call mutation with correct variables and return mapped entity', async () => {
      const entity = createEntity();
      const publicationId = faker.string.uuid();
      const createdId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createLocation: {
          locationId: createdId,
          canonical: entity.canonical,
          fullTextUrl: entity.fullTextUrl,
          landingPage: entity.landingPage,
          locationPlatform: entity.locationPlatform,
        },
      });

      const result = await service.createLocation(entity, publicationId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            publicationId,
            canonical: entity.canonical,
            locationPlatform: entity.locationPlatform,
          }),
        }),
      );
      expect(result.id).toBe(createdId);
    });

    it('should call toDto with the entity', async () => {
      const entity = createEntity();
      const publicationId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createLocation: { locationId: faker.string.uuid() },
      });

      await service.createLocation(entity, publicationId);

      expect(mockMapper.toDto).toHaveBeenCalledWith(entity);
    });
  });

  describe('updateLocation', () => {
    it('should include locationId in mutation variables', async () => {
      const entity = createEntity();
      const publicationId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateLocation: {
          locationId: entity.id,
          canonical: entity.canonical,
          fullTextUrl: entity.fullTextUrl,
          landingPage: entity.landingPage,
          locationPlatform: entity.locationPlatform,
        },
      });

      const result = await service.updateLocation(entity, publicationId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            locationId: entity.id,
            publicationId,
          }),
        }),
      );
      expect(result.id).toBe(entity.id);
    });
  });

  describe('deleteLocation', () => {
    it('should call mutation with locationId', async () => {
      const locationId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deleteLocation: { locationId },
      });

      await service.deleteLocation(locationId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ locationId }),
      );
    });

    it('should throw when mutation fails', async () => {
      const locationId = faker.string.uuid();
      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'));

      const promise = service.deleteLocation(locationId);

      await expect(promise).rejects.toThrow('Delete failed');
    });
  });
});
