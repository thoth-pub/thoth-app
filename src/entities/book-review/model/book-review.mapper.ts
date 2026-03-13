import type { BaseMapper } from '@/src/shared/interfaces';

import { BookReviewDto, BookReviewEntity } from './book-review.types';

export class BookReviewDtoMapper implements BaseMapper<BookReviewEntity, BookReviewDto> {
  toEntity(dto: BookReviewDto): BookReviewEntity {
    const {
      bookReviewId,
      workId,
      title,
      authorName,
      url,
      doi,
      reviewDate,
      journalName,
      journalVolume,
      journalNumber,
      journalIssn,
      text,
      reviewOrdinal,
    } = dto;

    return {
      id: bookReviewId,
      workId,
      title: title ?? '',
      authorName: authorName ?? '',
      url: url ?? '',
      doi: doi ?? '',
      reviewDate: reviewDate ?? '',
      journalName: journalName ?? '',
      journalVolume: journalVolume ?? '',
      journalNumber: journalNumber ?? '',
      journalIssn: journalIssn ?? '',
      text: text ?? '',
      orderNumber: reviewOrdinal,
    };
  }

  toDto(entity: BookReviewEntity): BookReviewDto {
    const {
      id,
      workId,
      title,
      authorName,
      url,
      doi,
      reviewDate,
      journalName,
      journalVolume,
      journalNumber,
      journalIssn,
      text,
      orderNumber,
    } = entity;

    return {
      bookReviewId: id,
      workId,
      title: title && title.length > 0 ? title : null,
      authorName: authorName && authorName.length > 0 ? authorName : null,
      url: url && url.length > 0 ? url : null,
      doi: doi && doi.length > 0 ? doi : null,
      reviewDate: reviewDate && reviewDate.length > 0 ? reviewDate : null,
      journalName: journalName && journalName.length > 0 ? journalName : null,
      journalVolume: journalVolume && journalVolume.length > 0 ? journalVolume : null,
      journalNumber: journalNumber && journalNumber.length > 0 ? journalNumber : null,
      journalIssn: journalIssn && journalIssn.length > 0 ? journalIssn : null,
      text: text && text.length > 0 ? text : null,
      reviewOrdinal: orderNumber,
    };
  }
}
