import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';

import { ImprintDtoMapper } from '../model/imprint.mapper';
import type { ImprintEntity } from '../model/imprint.types';
import { ImprintService } from './imprint.service';

describe('ImprintService', () => {
  let service: ImprintService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: ImprintDtoMapper;

  const createEntity = (overrides?: Partial<ImprintEntity>): ImprintEntity => ({
    id: faker.string.uuid(),
    name: 'Test Imprint',
    url: 'https://example.com',
    updatedAt: '2024-01-01T00:00:00Z',
    publisherName: 'Test Publisher',
    crossmarkDoi: '10.1234/crossmark',
    defaultCurrency: 'GBP' as ImprintEntity['defaultCurrency'],
    defaultLocale: 'en' as ImprintEntity['defaultLocale'],
    defaultPlace: 'London',
    s3Bucket: 'test-bucket',
    cdnDomain: 'cdn.example.com',
    cloudfrontDistId: 'CF123',
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new ImprintDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: ImprintEntity, isSuperuser?: boolean) => ({
      imprintId: entity.id,
      imprintName: entity.name,
      imprintUrl: entity.url,
      updatedAt: entity.updatedAt,
      crossmarkDoi: entity.crossmarkDoi,
      defaultCurrency: entity.defaultCurrency,
      defaultLocale: entity.defaultLocale,
      defaultPlace: entity.defaultPlace,
      ...(isSuperuser ? { s3Bucket: entity.s3Bucket, cdnDomain: entity.cdnDomain, cloudfrontDistId: entity.cloudfrontDistId } : {}),
      publisher: { publisherName: entity.publisherName },
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: any) => ({
      id: dto.imprintId,
      name: dto.imprintName,
      url: dto.imprintUrl ?? '',
      updatedAt: dto.updatedAt,
      publisherName: dto.publisher?.publisherName ?? '',
      crossmarkDoi: dto.crossmarkDoi ?? '',
      defaultCurrency: dto.defaultCurrency ?? 'GBP',
      defaultLocale: dto.defaultLocale ?? 'en',
      defaultPlace: dto.defaultPlace ?? '',
      s3Bucket: dto.s3Bucket ?? '',
      cdnDomain: dto.cdnDomain ?? '',
      cloudfrontDistId: dto.cloudfrontDistId ?? '',
    }));

    service = new ImprintService(mockGraphqlService, mockMapper);
  });

  describe('getImprintsCount', () => {
    it('should call query with publishersIds and return count', async () => {
      const publishersIds = [faker.string.uuid()];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        imprintCount: 5,
      });

      const result = await service.getImprintsCount(publishersIds);

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ publishers: publishersIds }),
      );
      expect(result).toBe(5);
    });

    it('should return 0 when imprintCount is undefined', async () => {
      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await service.getImprintsCount([faker.string.uuid()]);

      expect(result).toBe(0);
    });
  });

  describe('getImprints', () => {
    it('should use GET_IMPRINTS for non-superuser', async () => {
      const publishersIds = [faker.string.uuid()];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        imprints: [],
      });

      await service.getImprints({ publishersIds, isSuperuser: false });

      const callQuery = (mockGraphqlService.query as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callQuery).toBeDefined();
    });

    it('should use GET_IMPRINTS_ADMIN for superuser', async () => {
      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        imprints: [],
      });

      await service.getImprints({ publishersIds: [faker.string.uuid()], isSuperuser: true });

      const callQuery = (mockGraphqlService.query as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callQuery).toBeDefined();
    });

    it('should pass offset and limit', async () => {
      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        imprints: [],
      });

      await service.getImprints({ publishersIds: [faker.string.uuid()], offset: 10, limit: 5 });

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ offset: 10, limit: 5 }),
      );
    });

    it('should map each imprint dto to entity', async () => {
      const publishersIds = [faker.string.uuid()];
      const imprintDtos = [
        { imprintId: faker.string.uuid(), imprintName: 'A', publisher: { publisherName: 'P' } },
        { imprintId: faker.string.uuid(), imprintName: 'B', publisher: { publisherName: 'P' } },
      ];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        imprints: imprintDtos,
      });

      const result = await service.getImprints({ publishersIds });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(imprintDtos[0].imprintId);
    });

    it('should return empty array when imprints is undefined', async () => {
      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await service.getImprints({ publishersIds: [] });

      expect(result).toEqual([]);
    });
  });

  describe('getPublisherImprints', () => {
    it('should call getImprints with correct parameters', async () => {
      const publisherId = faker.string.uuid();
      const getImprintsSpy = vi.spyOn(service, 'getImprints' as any).mockResolvedValue([]);

      await service.getPublisherImprints(publisherId, true);

      expect(getImprintsSpy).toHaveBeenCalledWith({
        publishersIds: [publisherId],
        offset: 0,
        limit: expect.any(Number),
        isSuperuser: true,
      });
    });
  });

  describe('createImprint', () => {
    it('should call mutation with publisherId and imprintName', async () => {
      const publisherId = faker.string.uuid();
      const imprintName = 'New Imprint';

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createImprint: { imprintId: faker.string.uuid() },
      });

      await service.createImprint({ publisherId, imprintName });

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: { publisherId, imprintName },
        }),
      );
    });
  });

  describe('updateImprint', () => {
    it('should use UPDATE_IMPRINT for non-superuser', async () => {
      const entity = createEntity();
      const publisherId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateImprint: { imprintId: entity.id, publisher: { publisherName: entity.publisherName } },
      });

      await service.updateImprint(entity, publisherId, false);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ imprintId: entity.id, publisherId, imprintName: entity.name }),
        }),
      );
    });

    it('should use UPDATE_IMPRINT_ADMIN for superuser', async () => {
      const entity = createEntity();
      const publisherId = faker.string.uuid();

      mockMapper.toDto = vi.fn().mockReturnValue({
        imprintId: entity.id,
        imprintName: entity.name,
        publisher: { publisherName: entity.publisherName },
        s3Bucket: entity.s3Bucket,
      });

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateImprint: { imprintId: entity.id, publisher: { publisherName: entity.publisherName } },
      });

      await service.updateImprint(entity, publisherId, true);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ imprintId: entity.id, publisherId }),
        }),
      );
    });
  });

  describe('deleteImprint', () => {
    it('should call mutation with imprintId', async () => {
      const imprintId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deleteImprint: { imprintId },
      });

      await service.deleteImprint(imprintId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ imprintId }),
      );
    });
  });
});
