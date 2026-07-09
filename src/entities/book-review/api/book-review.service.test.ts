import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphqlService } from '@/src/shared/api/graphqlService';
import { MarkdownFormats } from '@/src/shared/constants/markdown';

import { BookReviewDtoMapper } from '../model/book-review.mapper';
import type { BookReviewDto, BookReviewEntity } from '../model/book-review.types';
import { BookReviewService } from './book-review.service';

describe('BookReviewService', () => {
  let service: BookReviewService;
  let mockGraphqlService: GraphqlService;
  let mockMapper: BookReviewDtoMapper;

  const createEntity = (overrides?: Partial<BookReviewEntity>): BookReviewEntity => ({
    id: faker.string.uuid(),
    workId: faker.string.uuid(),
    title: 'Great Book',
    authorName: 'Reviewer',
    reviewerOrcid: '0000-0001-2345-6789',
    reviewerInstitutionId: faker.string.uuid(),
    reviewerInstitutionName: 'Test University',
    reviewerInstitutionRor: 'https://ror.org/test',
    url: 'https://example.com/review',
    doi: '10.1234/review',
    reviewDate: '2024-06-01',
    journalName: 'Test Journal',
    journalVolume: '10',
    journalNumber: '2',
    journalIssn: '1234-5678',
    pageRange: '100-110',
    text: 'This is a great book.',
    orderNumber: 1,
    ...overrides,
  });

  beforeEach(() => {
    mockGraphqlService = {
      query: vi.fn(),
      mutation: vi.fn(),
    } as unknown as GraphqlService;

    mockMapper = new BookReviewDtoMapper();
    vi.spyOn(mockMapper, 'toDto').mockImplementation((entity: BookReviewEntity) => ({
      bookReviewId: entity.id,
      workId: entity.workId,
      title: entity.title,
      authorName: entity.authorName,
      reviewerOrcid: entity.reviewerOrcid,
      reviewerInstitutionId: entity.reviewerInstitutionId,
      url: entity.url,
      doi: entity.doi,
      reviewDate: entity.reviewDate,
      journalName: entity.journalName,
      journalVolume: entity.journalVolume,
      journalNumber: entity.journalNumber,
      journalIssn: entity.journalIssn,
      pageRange: entity.pageRange,
      text: entity.text,
      reviewOrdinal: entity.orderNumber,
    }));

    vi.spyOn(mockMapper, 'toEntity').mockImplementation((dto: BookReviewDto) => ({
      id: dto.bookReviewId,
      workId: dto.workId,
      title: dto.title ?? '',
      authorName: dto.authorName ?? '',
      reviewerOrcid: dto.reviewerOrcid ?? '',
      reviewerInstitutionId: dto.reviewerInstitutionId ?? '',
      reviewerInstitutionName: dto.reviewerInstitution?.institutionName ?? '',
      reviewerInstitutionRor: dto.reviewerInstitution?.ror ?? '',
      url: dto.url ?? '',
      doi: dto.doi ?? '',
      reviewDate: dto.reviewDate ?? '',
      journalName: dto.journalName ?? '',
      journalVolume: dto.journalVolume ?? '',
      journalNumber: dto.journalNumber ?? '',
      journalIssn: dto.journalIssn ?? '',
      pageRange: dto.pageRange ?? '',
      text: dto.text ?? '',
      orderNumber: dto.reviewOrdinal,
    }));

    service = new BookReviewService(mockGraphqlService, mockMapper);
  });

  describe('createBookReview', () => {
    it('should call mutation with PLAIN_TEXT markupFormat for plain text', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();
      const createdId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createBookReview: { bookReviewId: createdId },
      });

      await service.createBookReview(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          markupFormat: MarkdownFormats.enum.PLAIN_TEXT,
          data: expect.objectContaining({ workId, reviewOrdinal: entity.orderNumber }),
        }),
      );
    });

    it('should call mutation with JATS_XML markupFormat when content has markdown tags', async () => {
      const entity = createEntity({ text: '<p>HTML review</p>' });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createBookReview: { bookReviewId: faker.string.uuid() },
      });

      await service.createBookReview(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          markupFormat: MarkdownFormats.enum.JATS_XML,
        }),
      );
    });

    it('should default reviewOrdinal to 1 when orderNumber is undefined', async () => {
      const entity = createEntity({ orderNumber: undefined as unknown as number });
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        createBookReview: { bookReviewId: faker.string.uuid() },
      });

      await service.createBookReview(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ reviewOrdinal: 1 }),
        }),
      );
    });
  });

  describe('updateBookReview', () => {
    it('should include bookReviewId in mutation data', async () => {
      const entity = createEntity();
      const workId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        updateBookReview: { bookReviewId: entity.id },
      });

      await service.updateBookReview(entity, workId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          markupFormat: MarkdownFormats.enum.PLAIN_TEXT,
          data: expect.objectContaining({ bookReviewId: entity.id, workId }),
        }),
      );
    });
  });

  describe('deleteBookReview', () => {
    it('should call mutation with bookReviewId', async () => {
      const bookReviewId = faker.string.uuid();

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        deleteBookReview: { bookReviewId },
      });

      await service.deleteBookReview(bookReviewId);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ bookReviewId }),
      );
    });
  });

  describe('moveBookReview', () => {
    it('should call mutation with bookReviewId and newOrdinal', async () => {
      const bookReviewId = faker.string.uuid();
      const newOrdinal = 3;

      (mockGraphqlService.mutation as ReturnType<typeof vi.fn>).mockResolvedValue({
        moveBookReview: { bookReviewId, reviewOrdinal: newOrdinal },
      });

      const result = await service.moveBookReview(bookReviewId, newOrdinal);

      expect(mockGraphqlService.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ bookReviewId, newOrdinal }),
      );
      expect(result.id).toBe(bookReviewId);
    });
  });
});
