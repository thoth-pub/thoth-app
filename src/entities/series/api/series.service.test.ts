import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';

import { SeriesDtoMapper } from '../model/series.mapper';
import type { SeriesDto, SeriesEntity } from '../model/series.types';
import { SeriesService } from './series.service';

describe('SeriesService', () => {
  let service: SeriesService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: SeriesDtoMapper;

  const createEntity = (overrides?: Partial<SeriesEntity>): SeriesEntity => ({
    id: faker.string.uuid(),
    name: 'Test Series',
    type: 'BOOK_SERIES',
    issnPrint: '1234-5678',
    issnDigital: '8765-4321',
    updatedAt: '2024-01-01',
    imprintId: faker.string.uuid(),
    imprintName: 'Test Imprint',
    url: 'https://example.com/series',
    cfpUrl: 'https://example.com/cfp',
    description: 'A test series',
    issues: [],
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new SeriesDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: SeriesEntity) => ({
      seriesId: entity.id,
      seriesName: entity.name,
      seriesType: entity.type,
      issnPrint: entity.issnPrint,
      issnDigital: entity.issnDigital,
      updatedAt: entity.updatedAt,
      imprintId: entity.imprintId,
      seriesUrl: entity.url,
      seriesCfpUrl: entity.cfpUrl,
      seriesDescription: entity.description,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: SeriesDto) => ({
      id: dto.seriesId,
      name: dto.seriesName ?? '',
      type: dto.seriesType,
      issnPrint: dto.issnPrint ?? '',
      issnDigital: dto.issnDigital ?? '',
      updatedAt: dto.updatedAt,
      imprintId: dto.imprintId ?? '',
      imprintName: dto.imprint?.imprintName ?? '',
      url: dto.seriesUrl ?? '',
      cfpUrl: dto.seriesCfpUrl ?? '',
      description: dto.seriesDescription ?? '',
      issues: dto.issues?.map((issue) => ({
        id: issue.issueId,
        ordinal: issue.issueOrdinal,
        workId: issue.work.workId,
        title: issue.work.title,
        seriesId: dto.seriesId,
        coverUrl: issue.work.coverUrl ?? '',
      })) ?? [],
    }));

    service = new SeriesService(mockGraphqlService, mockMapper);
  });

  describe('getSeries', () => {
    it('should call query and return the mapped entity', async () => {
      const seriesId = faker.string.uuid();
      const dto = { seriesId, seriesName: 'Test', seriesType: 'BOOK_SERIES', imprint: { imprintName: '' }, issues: [] } as unknown as SeriesDto;

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({ series: dto });

      const result = await service.getSeries(seriesId);

      expect(mockGraphqlService.query).toHaveBeenCalledWith(expect.anything(), { seriesId });
      expect(result.id).toBe(seriesId);
    });
  });

  describe('getSerieses', () => {
    it('should call query with pagination params and map results', async () => {
      const publishersIds = [faker.string.uuid()];
      const dto = { seriesId: faker.string.uuid(), seriesName: 'Test', seriesType: 'BOOK_SERIES', imprint: { imprintName: '' }, issues: [] } as unknown as SeriesDto;

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({ serieses: [dto] });

      const result = await service.getSerieses({ publishersIds, offset: 0, limit: 20 });

      expect(mockGraphqlService.query).toHaveBeenCalledWith(expect.anything(), { publishers: publishersIds, offset: 0, limit: 20, direction: undefined, filter: undefined, field: undefined, seriesTypes: [] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(dto.seriesId);
    });

    it('should pass seriesType as an array when provided', async () => {
      const publishersIds = [faker.string.uuid()];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({ serieses: [] });

      await service.getSerieses({ publishersIds, seriesType: 'BOOK_SERIES' });

      expect(mockGraphqlService.query).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ seriesTypes: ['BOOK_SERIES'] }));
    });
  });

  describe('getSeriesCount', () => {
    it('should return the series count', async () => {
      const publishersIds = [faker.string.uuid()];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({ seriesCount: 42 });

      const result = await service.getSeriesCount({ publishersIds });

      expect(mockGraphqlService.query).toHaveBeenCalledWith(expect.anything(), { publishers: publishersIds, filter: undefined });
      expect(result).toBe(42);
    });
  });

  describe('getAllSerieses', () => {
    it('should paginate through all series', async () => {
      const publishersIds = [faker.string.uuid()];
      vi.spyOn(service, 'getSeriesCount').mockResolvedValue(3);
      vi.spyOn(service, 'getSerieses').mockResolvedValue([
        createEntity({ id: 's1' }),
        createEntity({ id: 's2' }),
      ]);

      const result = await service.getAllSerieses({ publishersIds, limit: 2 });

      expect(service.getSeriesCount).toHaveBeenCalledWith({ publishersIds });
      expect(service.getSerieses).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe('s1');
      expect(result[1].id).toBe('s2');
    });
  });

  describe('createSeries', () => {
    it('should call mutation and return the entity with the new id', async () => {
      const entity = createEntity();
      const createdSeriesId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({ createSeries: { seriesId: createdSeriesId } });

      const result = await service.createSeries(entity);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            seriesName: entity.name,
            seriesType: entity.type,
            imprintId: entity.imprintId,
          }),
        }),
      );
      expect(result.id).toBe(createdSeriesId);
    });

    it('should fall back to defaults when fields are null', async () => {
      const entity = createEntity({ name: undefined as unknown as string, imprintId: undefined as unknown as string, type: undefined as unknown as SeriesEntity['type'] });

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({ createSeries: { seriesId: faker.string.uuid() } });

      await service.createSeries(entity);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            seriesName: '',
            imprintId: '',
            seriesType: 'BOOK_SERIES',
          }),
        }),
      );
    });
  });

  describe('updateSeries', () => {
    it('should call mutation with seriesId', async () => {
      const entity = createEntity();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({ updateSeries: { seriesId: entity.id } });

      await service.updateSeries(entity);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            seriesId: entity.id,
          }),
        }),
      );
    });
  });

  describe('deleteSeries', () => {
    it('should call mutation with seriesId', async () => {
      const seriesId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({ deleteSeries: { seriesId } });

      await service.deleteSeries(seriesId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(expect.anything(), { seriesId });
    });
  });

  describe('createIssue', () => {
    it('should call mutation with issue data', async () => {
      const orderNumber = 1;
      const seriesId = faker.string.uuid();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({ createIssue: { issueId: faker.string.uuid() } });

      const result = await service.createIssue({ orderNumber, seriesId, workId });

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: { issueOrdinal: orderNumber, seriesId, workId },
        }),
      );
      expect(result).toBeDefined();
    });
  });

  describe('updateIssue', () => {
    it('should call mutation with issue data', async () => {
      const issueId = faker.string.uuid();
      const orderNumber = 2;
      const seriesId = faker.string.uuid();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({ updateIssue: { issueId } });

      const result = await service.updateIssue({ issueId, orderNumber, seriesId, workId });

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: { issueId, issueOrdinal: orderNumber, seriesId, workId },
        }),
      );
      expect(result).toBeDefined();
    });
  });

  describe('deleteIssue', () => {
    it('should call mutation with issueId', async () => {
      const issueId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({ deleteIssue: { issueId } });

      await service.deleteIssue(issueId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(expect.anything(), { issueId });
    });
  });

  describe('moveIssue', () => {
    it('should call mutation with issueId and newOrdinal', async () => {
      const issueId = faker.string.uuid();
      const newOrdinal = 3;

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({ moveIssue: { issueId } });

      await service.moveIssue(issueId, newOrdinal);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(expect.anything(), { issueId, newOrdinal });
    });
  });
});
