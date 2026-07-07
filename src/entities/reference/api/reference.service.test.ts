import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';

import { ReferenceDtoMapper } from '../model/reference.mapper';
import type { ReferenceDto, ReferenceEntity } from '../model/reference.types';
import { ReferenceService } from './reference.service';

describe('ReferenceService', () => {
  let service: ReferenceService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: ReferenceDtoMapper;

  const createEntity = (overrides?: Partial<ReferenceEntity>): ReferenceEntity => ({
    id: faker.string.uuid(),
    doi: '10.1234/test',
    journalTitle: 'Test Journal',
    articleTitle: 'Test Article',
    seriesTitle: 'Test Series',
    volumeTitle: 'Test Volume',
    url: 'https://example.com',
    orderNumber: 1,
    unstructuredCitation: 'Test citation',
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new ReferenceDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: ReferenceEntity) => ({
      referenceId: entity.id,
      doi: entity.doi,
      journalTitle: entity.journalTitle,
      articleTitle: entity.articleTitle,
      seriesTitle: entity.seriesTitle,
      volumeTitle: entity.volumeTitle,
      url: entity.url,
      referenceOrdinal: entity.orderNumber,
      unstructuredCitation: entity.unstructuredCitation,
      workId: '',
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: ReferenceDto) => ({
      id: dto.referenceId,
      doi: dto.doi ?? '',
      journalTitle: dto.journalTitle ?? '',
      articleTitle: dto.articleTitle ?? '',
      seriesTitle: dto.seriesTitle ?? '',
      volumeTitle: dto.volumeTitle ?? '',
      url: dto.url ?? '',
      orderNumber: dto.referenceOrdinal ?? 1,
      unstructuredCitation: dto.unstructuredCitation ?? '',
    }));

    service = new ReferenceService(mockGraphqlService, mockMapper);
  });

  describe('createReference', () => {
    it('should call mutation with correct variables and return mapped entity', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();
      const createdId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createReference: {
          referenceId: createdId,
          doi: entity.doi,
          journalTitle: entity.journalTitle,
          articleTitle: entity.articleTitle,
          seriesTitle: entity.seriesTitle,
          volumeTitle: entity.volumeTitle,
          url: entity.url,
          referenceOrdinal: entity.orderNumber,
          unstructuredCitation: entity.unstructuredCitation,
        },
      });

      const result = await service.createReference(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            workId,
            referenceOrdinal: entity.orderNumber,
          }),
        }),
      );
      expect(result.id).toBe(createdId);
    });

    it('should default referenceOrdinal to 1 when orderNumber is undefined', async () => {
      const entity = createEntity({ orderNumber: undefined as unknown as number });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createReference: { referenceId: faker.string.uuid(), referenceOrdinal: 1 },
      });

      await service.createReference(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ referenceOrdinal: 1 }),
        }),
      );
    });

    it('should call toDto with the entity', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createReference: { referenceId: faker.string.uuid() },
      });

      await service.createReference(entity, workId);

      expect(mockMapper.toDto).toHaveBeenCalledWith(entity);
    });
  });

  describe('updateReference', () => {
    it('should include referenceId in mutation variables', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateReference: {
          referenceId: entity.id,
          doi: entity.doi,
          referenceOrdinal: entity.orderNumber,
        },
      });

      const result = await service.updateReference(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            referenceId: entity.id,
            workId,
            referenceOrdinal: entity.orderNumber,
          }),
        }),
      );
      expect(result.id).toBe(entity.id);
    });
  });

  describe('deleteReference', () => {
    it('should call mutation with referenceId', async () => {
      const referenceId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deleteReference: { referenceId },
      });

      await service.deleteReference(referenceId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ referenceId }),
      );
    });

    it('should throw when mutation fails', async () => {
      const referenceId = faker.string.uuid();
      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'));

      const promise = service.deleteReference(referenceId);

      await expect(promise).rejects.toThrow('Delete failed');
    });
  });

  describe('moveReference', () => {
    it('should call mutation with referenceId and newOrdinal', async () => {
      const referenceId = faker.string.uuid();
      const newOrdinal = 3;

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        moveReference: { referenceId, referenceOrdinal: newOrdinal },
      });

      const result = await service.moveReference(referenceId, newOrdinal);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ referenceId, newOrdinal }),
      );
      expect(result.id).toBe(referenceId);
    });
  });
});
