import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';
import { CurrencyCode, LocationPlatforms, PublicationType } from '@/src/shared/constants';
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

  describe('createImportPublication (thoth-app#187)', () => {
    const location = (fullTextUrl: string, canonical: boolean) => ({
      id: '',
      canonical,
      fullTextUrl,
      landingPage: `${fullTextUrl}/landing`,
      locationPlatform: LocationPlatforms.enum.Other,
    });
    const { Gbp, Usd, Eur } = CurrencyCode.enum;
    const price = (currencyCode: typeof Gbp | typeof Usd | typeof Eur, unitPrice: number) => ({
      id: '',
      currencyCode,
      unitPrice,
    });

    /** Every child write as it starts and as it returns, with how many were in flight at once. */
    const journal = () => {
      const events: string[] = [];
      let inFlight = 0;
      let maxInFlight = 0;
      const gates = new Map<string, { release: () => void; fail: (error: Error) => void }>();
      const write = (name: string, gated: boolean, result: unknown) => {
        events.push(`start ${name}`);
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);

        return new Promise((resolve, reject) => {
          const settle = (error?: Error) => {
            inFlight -= 1;
            events.push(`${error ? 'fail' : 'end'} ${name}`);

            if (error) reject(error);
            else resolve(result);
          };

          if (gated) gates.set(name, { release: () => settle(), fail: (error) => settle(error) });
          else setTimeout(() => settle(), 1);
        });
      };

      return { events, gates, write, maxInFlight: () => maxInFlight };
    };

    beforeEach(() => {
      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createPublication: { publicationId: 'publication-1', publicationType: 'PDF' },
      });
    });

    it('creates the Publication, then its Prices in order, then the canonical Location, then every other one in order, one at a time', async () => {
      const { events, write, maxInFlight } = journal();
      const onCreated = vi.fn((id: string) => events.push(`created ${id}`));

      vi.mocked(mockPriceService.createPrice).mockImplementation(
        (data) => write(`price ${data.currencyCode}`, false, data) as never,
      );
      vi.mocked(mockLocationService.createLocation).mockImplementation(
        (data) => write(`location ${data.fullTextUrl}`, false, data) as never,
      );

      const result = await service.createImportPublication(
        createEntity({
          type: PublicationType.enum.Pdf,
          prices: [price(Gbp, 10), price(Usd, 12), price(Eur, 11)],
          locations: [location('https://b', false), location('https://canonical', true), location('https://c', false)],
        }),
        'work-1',
        onCreated,
      );

      expect(onCreated).toHaveBeenCalledExactlyOnceWith('publication-1');
      expect(events).toEqual([
        'created publication-1',
        'start price GBP',
        'end price GBP',
        'start price USD',
        'end price USD',
        'start price EUR',
        'end price EUR',
        'start location https://canonical',
        'end location https://canonical',
        'start location https://b',
        'end location https://b',
        'start location https://c',
        'end location https://c',
      ]);
      expect(maxInFlight()).toBe(1);
      expect(vi.mocked(mockPriceService.createPrice).mock.calls.every(([, id]) => id === 'publication-1')).toBe(true);
      expect(result.locations.map(({ fullTextUrl }) => fullTextUrl)).toEqual([
        'https://canonical',
        'https://b',
        'https://c',
      ]);
    });

    it('starts no other Location until the canonical one has returned', async () => {
      const { events, gates, write } = journal();

      vi.mocked(mockLocationService.createLocation).mockImplementation(
        (data) => write(`location ${data.fullTextUrl}`, data.canonical, data) as never,
      );

      const created = service.createImportPublication(
        createEntity({ locations: [location('https://other', false), location('https://canonical', true)] }),
        'work-1',
      );

      await vi.waitFor(() => expect(gates.has('location https://canonical')).toBe(true));
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(events).toEqual(['start location https://canonical']);

      gates.get('location https://canonical')?.release();
      await created;

      expect(events).toEqual([
        'start location https://canonical',
        'end location https://canonical',
        'start location https://other',
        'end location https://other',
      ]);
    });

    it('never starts another Location once the canonical one has failed, and fails with its error', async () => {
      const { events, gates, write } = journal();
      const onCreated = vi.fn();

      vi.mocked(mockLocationService.createLocation).mockImplementation(
        (data) => write(`location ${data.fullTextUrl}`, data.canonical, data) as never,
      );

      const created = service.createImportPublication(
        createEntity({ locations: [location('https://canonical', true), location('https://other', false)] }),
        'work-1',
        onCreated,
      );

      await vi.waitFor(() => expect(gates.has('location https://canonical')).toBe(true));
      gates.get('location https://canonical')?.fail(new Error('canonical refused'));

      await expect(created).rejects.toThrow('canonical refused');
      expect(events).toEqual(['start location https://canonical', 'fail location https://canonical']);
      // The Publication was created, and its owner was told so before any child was written.
      expect(onCreated).toHaveBeenCalledExactlyOnceWith('publication-1');
    });

    it('stops at a failed Price: no later Price and no Location is started', async () => {
      vi.mocked(mockPriceService.createPrice)
        .mockResolvedValueOnce(price(Gbp, 10) as never)
        .mockRejectedValueOnce(new Error('price refused'));

      await expect(
        service.createImportPublication(
          createEntity({
            prices: [price(Gbp, 10), price(Usd, 12), price(Eur, 11)],
            locations: [location('https://canonical', true)],
          }),
          'work-1',
        ),
      ).rejects.toThrow('price refused');
      expect(mockPriceService.createPrice).toHaveBeenCalledTimes(2);
      expect(mockLocationService.createLocation).not.toHaveBeenCalled();
    });

    it('never takes a response that names no Publication for one, and writes nothing under it', async () => {
      const onCreated = vi.fn();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({ createPublication: null });
      vi.spyOn(mockMapper, 'toEntity').mockReturnValue(createEntity({ id: undefined as unknown as string }));

      await expect(
        service.createImportPublication(createEntity({ prices: [price(Gbp, 1)] }), 'work-1', onCreated),
      ).rejects.toThrow('returned no Publication id');
      expect(onCreated).not.toHaveBeenCalled();
      expect(mockPriceService.createPrice).not.toHaveBeenCalled();
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
