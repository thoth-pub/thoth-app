import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';
import { FileStorage } from '@/src/shared/services';

import { LocationService } from '../../locations/api/location.service';
import { PriceService } from '../../price/api/price.service';
import { PublicationDtoMapper } from '../model/publication.mapper';
import type { PublicationDto, PublicationEntity } from '../model/publication.types';
import { PublicationService } from './publication.service';

describe('PublicationService', () => {
  let service: PublicationService;
  let mockGraphqlService: GraphqlService;
  let mockPriceService: PriceService;
  let mockLocationService: LocationService;
  let mockFileStorage: FileStorage;
  let mockMapper: PublicationDtoMapper;

  const createEntity = (overrides?: Partial<PublicationEntity>): PublicationEntity => ({
    id: faker.string.uuid(),
    isbn: '978-1-234-56789-0',
    titles: [],
    type: 'PAPERBACK',
    updatedAt: '2024-01-01',
    doi: '10.1234/test',
    publisherName: 'Test Publisher',
    width: 150,
    widthIn: 5.91,
    height: 220,
    heightIn: 8.66,
    depth: 10,
    depthIn: 0.39,
    weight: 300,
    weightOz: 10.58,
    prices: [],
    locations: [],
    accessibilityReportUrl: '',
    accessibilityAdditionalStandard: null,
    accessibilityException: null,
    accessibilityStandard: null,
    fileUrl: null,
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockPriceService = {
      query: vi.fn(),
      mutation: vi.fn(),
      createPrice: vi.fn(),
      updatePrice: vi.fn(),
      deletePrice: vi.fn(),
    } as unknown as PriceService;

    mockLocationService = {
      query: vi.fn(),
      mutation: vi.fn(),
      createLocation: vi.fn(),
      updateLocation: vi.fn(),
      deleteLocation: vi.fn(),
    } as unknown as LocationService;

    mockFileStorage = {
      uploadPublicationFile: vi.fn(),
    } as unknown as FileStorage;

    mockMapper = new PublicationDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity) => ({
      publicationId: entity.id,
      publicationType: entity.type,
      isbn: entity.isbn,
      widthMm: entity.width,
      widthIn: entity.widthIn,
      heightMm: entity.height,
      heightIn: entity.heightIn,
      depthMm: entity.depth,
      depthIn: entity.depthIn,
      weightG: entity.weight,
      weightOz: entity.weightOz,
      accessibilityReportUrl: entity.accessibilityReportUrl,
      accessibilityAdditionalStandard: entity.accessibilityAdditionalStandard,
      accessibilityException: entity.accessibilityException,
      accessibilityStandard: entity.accessibilityStandard,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: PublicationDto) => ({
      id: dto.publicationId,
      isbn: dto.isbn ?? '',
      titles: [],
      type: dto.publicationType,
      updatedAt: dto.updatedAt ?? '',
      doi: '',
      publisherName: '',
      width: dto.widthMm ?? 0,
      widthIn: dto.widthIn ?? 0,
      height: dto.heightMm ?? 0,
      heightIn: dto.heightIn ?? 0,
      depth: dto.depthMm ?? 0,
      depthIn: dto.depthIn ?? 0,
      weight: dto.weightG ?? 0,
      weightOz: dto.weightOz ?? 0,
      prices: [],
      locations: [],
      accessibilityReportUrl: dto.accessibilityReportUrl ?? '',
      accessibilityAdditionalStandard: dto.accessibilityAdditionalStandard ?? null,
      accessibilityException: dto.accessibilityException ?? null,
      accessibilityStandard: dto.accessibilityStandard ?? null,
      fileUrl: null,
    }));

    service = new PublicationService({
      graphqlService: mockGraphqlService,
      locationService: mockLocationService,
      priceService: mockPriceService,
      fileStorage: mockFileStorage,
      mapper: mockMapper,
    });
  });

  describe('createPublication', () => {
    it('should call mutation and return the publication', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();
      const createdPublicationId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createPublication: { publicationId: createdPublicationId, publicationType: entity.type },
      });

      const result = await service.createPublication(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            workId,
            publicationType: entity.type,
          }),
        }),
      );
      expect(result.id).toBe(createdPublicationId);
    });

    it('should create prices when provided', async () => {
      const price = { id: faker.string.uuid(), currencyCode: 'GBP', unitPrice: 19.99 };
      const entity = createEntity({ prices: [price] });
      const workId = faker.string.uuid();
      const createdPublicationId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createPublication: { publicationId: createdPublicationId, publicationType: entity.type },
      });
      (mockPriceService.createPrice as ReturnType<typeof vi.fn>).mockResolvedValue({ ...price, id: faker.string.uuid() });

      const result = await service.createPublication(entity, workId);

      expect(mockPriceService.createPrice).toHaveBeenCalledWith(price, createdPublicationId);
      expect(result.prices).toHaveLength(1);
    });

    it('should skip prices when none provided', async () => {
      const entity = createEntity({ prices: [] });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createPublication: { publicationId: faker.string.uuid(), publicationType: entity.type },
      });

      await service.createPublication(entity, workId);

      expect(mockPriceService.createPrice).not.toHaveBeenCalled();
    });

    it('should create locations when provided', async () => {
      const location = { id: faker.string.uuid(), canonical: true, fullTextUrl: '', landingPage: 'https://example.com', locationPlatform: 'PUBLISHER_WEBSITE' };
      const entity = createEntity({ locations: [location] });
      const workId = faker.string.uuid();
      const createdPublicationId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createPublication: { publicationId: createdPublicationId, publicationType: entity.type },
      });
      (mockLocationService.createLocation as ReturnType<typeof vi.fn>).mockResolvedValue({ ...location, id: faker.string.uuid() });

      const result = await service.createPublication(entity, workId);

      expect(mockLocationService.createLocation).toHaveBeenCalledWith(location, createdPublicationId);
      expect(result.locations).toHaveLength(1);
    });

    it('should skip locations when none provided', async () => {
      const entity = createEntity({ locations: [] });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createPublication: { publicationId: faker.string.uuid(), publicationType: entity.type },
      });

      await service.createPublication(entity, workId);

      expect(mockLocationService.createLocation).not.toHaveBeenCalled();
    });

    it('should upload file when provided', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();
      const createdPublicationId = faker.string.uuid();
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const fileUrl = 'https://cdn.example.com/test.pdf';

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createPublication: { publicationId: createdPublicationId, publicationType: entity.type },
      });
      (mockFileStorage.uploadPublicationFile as ReturnType<typeof vi.fn>).mockResolvedValue(fileUrl);

      const result = await service.createPublication(entity, workId, file);

      expect(mockFileStorage.uploadPublicationFile).toHaveBeenCalledWith(createdPublicationId, file, undefined);
      expect(result.fileUrl).toBe(fileUrl);
    });
  });

  describe('updatePublication', () => {
    it('should call mutation with publication data', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updatePublication: { publicationId: entity.id },
      });

      const result = await service.updatePublication(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            publicationId: entity.id,
            workId,
          }),
        }),
      );
      expect(result.id).toBe(entity.id);
    });
  });

  describe('deletePublication', () => {
    it('should call mutation with publicationId', async () => {
      const publicationId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({ deletePublication: { publicationId } });

      const result = await service.deletePublication(publicationId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(expect.anything(), { publicationId });
      expect(result).toBeDefined();
    });
  });

  describe('uploadPublicationFile', () => {
    it('should delegate to fileStorage', async () => {
      const publicationId = faker.string.uuid();
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const fileUrl = 'https://cdn.example.com/test.pdf';

      (mockFileStorage.uploadPublicationFile as ReturnType<typeof vi.fn>).mockResolvedValue(fileUrl);

      const result = await service.uploadPublicationFile(publicationId, file);

      expect(mockFileStorage.uploadPublicationFile).toHaveBeenCalledWith(publicationId, file, undefined);
      expect(result).toBe(fileUrl);
    });
  });
});
