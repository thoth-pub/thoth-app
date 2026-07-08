import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';

import { WorkDtoMapper } from '../../work/model/work.mapper';
import type { WorkDto, WorkEntity } from '../../work/model/work.types';
import { BookService } from './book.service';

describe('BookService', () => {
  let service: BookService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: WorkDtoMapper;

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new WorkDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: WorkEntity) => ({
      workId: entity.id,
    } as unknown as WorkDto));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: WorkDto) => ({
      id: dto.workId,
    } as unknown as WorkEntity));

    service = new BookService(mockGraphqlService, mockMapper);
  });

  describe('getBooks', () => {
    it('should call query with publishersIds and default offset', async () => {
      const publishersIds = [faker.string.uuid()];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        books: [],
      });

      await service.getBooks({ publishersIds });

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          publishers: publishersIds,
          offset: 0,
        }),
      );
    });

    it('should map each book dto to entity', async () => {
      const publishersIds = [faker.string.uuid()];
      const bookDtos = [
        { workId: faker.string.uuid() },
        { workId: faker.string.uuid() },
      ];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        books: bookDtos,
      });

      const result = await service.getBooks({ publishersIds });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(bookDtos[0].workId);
    });

    it('should pass startedAt and expression when both are provided', async () => {
      const publishersIds = [faker.string.uuid()];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        books: [],
      });

      await service.getBooks({
        publishersIds,
        startedAt: '2024-01-01',
        expression: 'AFTER',
      });

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          startedAt: '2024-01-01',
          expression: 'AFTER',
        }),
      );
    });

    it('should not pass startedAt when expression is not provided', async () => {
      const publishersIds = [faker.string.uuid()];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        books: [],
      });

      await service.getBooks({
        publishersIds,
        startedAt: '2024-01-01',
      });

      const callArg = (mockGraphqlService.query as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArg).not.toHaveProperty('startedAt');
    });

    it('should return empty array when books is undefined', async () => {
      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await service.getBooks({ publishersIds: [] });

      expect(result).toEqual([]);
    });

    it('should pass additional filter options', async () => {
      const publishersIds = [faker.string.uuid()];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        books: [],
      });

      await service.getBooks({
        publishersIds,
        limit: 20,
        direction: 'ASC',
        filter: 'test',
        workStatus: 'ACTIVE',
        field: 'TITLE',
      });

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          limit: 20,
          direction: 'ASC',
          filter: 'test',
          workStatus: 'ACTIVE',
          field: 'TITLE',
        }),
      );
    });
  });

  describe('getBooksCount', () => {
    it('should call query with publishersIds and return count', async () => {
      const publishersIds = [faker.string.uuid()];

      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        bookCount: 10,
      });

      const result = await service.getBooksCount({ publishersIds });

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ publishers: publishersIds }),
      );
      expect(result).toBe(10);
    });

    it('should return 0 when bookCount is undefined', async () => {
      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await service.getBooksCount({ publishersIds: [] });

      expect(result).toBe(0);
    });

    it('should pass publicationDate when publishedAt and expression are provided', async () => {
      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        bookCount: 0,
      });

      await service.getBooksCount({
        publishersIds: [],
        publishedAt: '2024-06-01',
        expression: 'BEFORE',
      });

      expect(mockGraphqlService.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          publicationDate: { timestamp: '2024-06-01', expression: 'BEFORE' },
        }),
      );
    });

    it('should not pass publicationDate when publishedAt is not provided', async () => {
      (mockGraphqlService.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        bookCount: 0,
      });

      await service.getBooksCount({
        publishersIds: [],
        expression: 'AFTER',
      });

      const callArg = (mockGraphqlService.query as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArg).not.toHaveProperty('publicationDate');
    });
  });
});
