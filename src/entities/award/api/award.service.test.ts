import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { GraphqlService } from '@/src/shared/api/graphqlService';

import { AwardDtoMapper } from '../model/award.mapper';
import type { AwardDto, AwardEntity } from '../model/award.types';
import { AwardService } from './award.service';

describe('AwardService', () => {
  let service: AwardService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: AwardDtoMapper;

  const createEntity = (overrides?: Partial<AwardEntity>): AwardEntity => ({
    id: faker.string.uuid(),
    workId: faker.string.uuid(),
    title: 'Test Award',
    url: 'https://example.com/award',
    category: 'Best Book',
    statement: 'Award statement',
    role: null,
    orderNumber: 1,
    jury: 'Test Jury',
    year: '2024',
    country: null,
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new AwardDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: AwardEntity) => ({
      awardId: entity.id,
      title: entity.title,
      url: entity.url,
      category: entity.category,
      statement: entity.statement,
      orderNumber: entity.orderNumber,
      jury: entity.jury,
      year: entity.year,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: AwardDto) => ({
      id: dto.awardId,
      workId: '',
      title: dto.title ?? '',
      url: dto.url ?? '',
      category: dto.category ?? '',
      statement: dto.statement ?? '',
      role: null,
      orderNumber: dto.awardOrdinal ?? dto.orderNumber ?? 1,
      jury: dto.jury ?? '',
      year: dto.year ?? '',
      country: null,
    }));

    service = new AwardService(mockGraphqlService, mockMapper);
  });

  describe('createAward', () => {
    it('should set PLAIN_TEXT markup for a plain text title', async () => {
      const entity = createEntity({ title: 'Plain text award' });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createAward: { awardId: faker.string.uuid(), title: entity.title },
      });

      await service.createAward(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ markupFormat: MarkdownFormats.enum.PLAIN_TEXT }),
      );
    });

    it('should set JATS_XML markup for a title containing JATS tags', async () => {
      const entity = createEntity({ title: '<italic>Italic</italic> award' });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createAward: { awardId: faker.string.uuid(), title: entity.title },
      });

      await service.createAward(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ markupFormat: MarkdownFormats.enum.JATS_XML }),
      );
    });

    it('should default awardOrdinal to 1 when orderNumber is undefined', async () => {
      const entity = createEntity({ orderNumber: undefined as unknown as number });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createAward: { awardId: faker.string.uuid() },
      });

      await service.createAward(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ awardOrdinal: 1 }),
        }),
      );
    });

    it('should call toDto with the entity', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createAward: { awardId: faker.string.uuid() },
      });

      await service.createAward(entity, workId);

      expect(mockMapper.toDto).toHaveBeenCalledWith(entity);
    });
  });

  describe('updateAward', () => {
    it('should include awardId and markup format in mutation variables', async () => {
      const entity = createEntity({ title: 'Updated award' });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateAward: { awardId: entity.id },
      });

      await service.updateAward(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            awardId: entity.id,
            workId,
          }),
          markupFormat: MarkdownFormats.enum.PLAIN_TEXT,
        }),
      );
    });

    it('should detect JATS markup on update', async () => {
      const entity = createEntity({ title: '<bold>Bold</bold> update' });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateAward: { awardId: entity.id },
      });

      await service.updateAward(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ markupFormat: MarkdownFormats.enum.JATS_XML }),
      );
    });
  });

  describe('deleteAward', () => {
    it('should call mutation with awardId', async () => {
      const awardId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deleteAward: { awardId },
      });

      await service.deleteAward(awardId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ awardId }),
      );
    });

    it('should throw when mutation fails', async () => {
      const awardId = faker.string.uuid();
      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'));

      const promise = service.deleteAward(awardId);

      await expect(promise).rejects.toThrow('Delete failed');
    });
  });

  describe('moveAward', () => {
    it('should call mutation with awardId and newOrdinal', async () => {
      const awardId = faker.string.uuid();
      const newOrdinal = 2;

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        moveAward: { awardId, awardOrdinal: newOrdinal },
      });

      const result = await service.moveAward(awardId, newOrdinal);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ awardId, newOrdinal }),
      );
      expect(result.id).toBe(awardId);
    });
  });
});
