import { GraphqlService } from '@/src/shared/api/graphqlService';
import { MarkdownFormats } from '@/src/shared/constants/markdown';
import { BaseService } from '@/src/shared/interfaces/services';
import { isTextContainsAnyMarkdownTag } from '@/src/shared/utils';

import type { WorkId } from '../../work/model/work.types';
import { BookReviewDtoMapper } from '../model/book-review.mapper';
import {
  CREATE_BOOK_REVIEW,
  DELETE_BOOK_REVIEW,
  MOVE_BOOK_REVIEW,
  UPDATE_BOOK_REVIEW,
} from '../model/book-review.mutations';
import type { BookReviewDto, BookReviewEntity, BookReviewId } from '../model/book-review.types';

export class BookReviewService extends BaseService<BookReviewEntity, BookReviewDto> {
  constructor(graphqlService: GraphqlService, mapper = new BookReviewDtoMapper()) {
    super(graphqlService, mapper);
  }

  private getMarkupFormat(text: string) {
    return isTextContainsAnyMarkdownTag(text) ? MarkdownFormats.enum.JATS_XML : MarkdownFormats.enum.PLAIN_TEXT;
  }

  async createBookReview(data: BookReviewEntity, relatedWorkId: WorkId): Promise<BookReviewEntity> {
    const { bookReviewId: _, ...dto } = this.dtoMapper.toDto(data);

    const markupFormat = this.getMarkupFormat(`${data.title} ${data.text}`);

    const response = await this.graphqlService.mutation(CREATE_BOOK_REVIEW, {
      data: { ...dto, workId: relatedWorkId, reviewOrdinal: data.orderNumber ?? 1 },
      markupFormat,
    });

    const bookReview = this.dtoMapper.toEntity(response.createBookReview as BookReviewDto);

    return bookReview;
  }

  async updateBookReview(data: BookReviewEntity, relatedWorkId: WorkId): Promise<BookReviewEntity> {
    const dto = this.dtoMapper.toDto(data);

    const markupFormat = this.getMarkupFormat(`${data.title} ${data.text}`);

    const response = await this.graphqlService.mutation(UPDATE_BOOK_REVIEW, {
      data: { ...dto, workId: relatedWorkId, bookReviewId: data.id, reviewOrdinal: data.orderNumber ?? 1 },
      markupFormat,
    });

    const bookReview = this.dtoMapper.toEntity(response.updateBookReview as BookReviewDto);

    return bookReview;
  }

  async deleteBookReview(bookReviewId: string) {
    await this.graphqlService.mutation(DELETE_BOOK_REVIEW, {
      bookReviewId,
    });
  }

  async moveBookReview(bookReviewId: BookReviewId, newOrdinal: number): Promise<BookReviewEntity> {
    const response = await this.graphqlService.mutation(MOVE_BOOK_REVIEW, {
      bookReviewId,
      newOrdinal,
    });

    const bookReview = this.dtoMapper.toEntity(response.moveBookReview as BookReviewDto);

    return bookReview;
  }
}
