import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';
import { MarkdownFormats } from '@/src/shared/constants/markdown';

import { AbstractDtoMapper } from '../model/abstract.mapper';
import type { AbstractDto, AbstractEntity } from '../model/abstract.types';
import { AbstractService } from './abstract.service';

describe('AbstractService', () => {
  let service: AbstractService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: AbstractDtoMapper;

  const createEntity = (overrides?: Partial<AbstractEntity>): AbstractEntity => ({
    id: faker.string.uuid(),
    type: 'DESCRIPTIVE',
    canonical: true,
    content: 'This is a plain text abstract.',
    localeCode: 'en',
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new AbstractDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: AbstractEntity) => ({
      abstractId: entity.id,
      abstractType: entity.type,
      canonical: entity.canonical,
      content: entity.content,
      localeCode: entity.localeCode,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: AbstractDto) => ({
      id: dto.abstractId,
      type: dto.abstractType,
      canonical: dto.canonical,
      content: dto.content,
      localeCode: dto.localeCode,
    }));

    service = new AbstractService(mockGraphqlService, mockMapper);
  });

  describe('createAbstract', () => {
    it('should call mutation with PLAIN_TEXT markupFormat for plain text', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();
      const createdId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createAbstract: { abstractId: createdId },
      });

      await service.createAbstract(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          markupFormat: MarkdownFormats.enum.PLAIN_TEXT,
          data: expect.objectContaining({ workId }),
        }),
      );
    });

    it('should call mutation with JATS_XML markupFormat for markdown content', async () => {
      const entity = createEntity({ content: '<p>HTML content</p>' });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createAbstract: { abstractId: faker.string.uuid() },
      });

      await service.createAbstract(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          markupFormat: MarkdownFormats.enum.JATS_XML,
        }),
      );
    });

    it('should return mapped entity', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();
      const createdId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createAbstract: {
          abstractId: createdId,
          abstractType: entity.type,
          canonical: entity.canonical,
          content: entity.content,
          localeCode: entity.localeCode,
        },
      });

      const result = await service.createAbstract(entity, workId);

      expect(result.id).toBe(createdId);
      expect(result.content).toBe(entity.content);
    });
  });

  describe('updateAbstract', () => {
    it('should include abstractId in mutation data and markupFormat', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateAbstract: { abstractId: entity.id },
      });

      await service.updateAbstract(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          markupFormat: MarkdownFormats.enum.PLAIN_TEXT,
          data: expect.objectContaining({ abstractId: entity.id, workId }),
        }),
      );
    });
  });

  describe('deleteAbstract', () => {
    it('should call mutation with abstractId', async () => {
      const abstractId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deleteAbstract: { abstractId },
      });

      await service.deleteAbstract(abstractId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ abstractId }),
      );
    });

    it('should throw when mutation fails', async () => {
      const abstractId = faker.string.uuid();
      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'));

      const promise = service.deleteAbstract(abstractId);

      await expect(promise).rejects.toThrow('Delete failed');
    });
  });
});
