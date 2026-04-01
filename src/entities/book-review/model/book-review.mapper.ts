import type { BaseMapper } from '@/src/shared/interfaces';
import { emptyToNull } from '@/src/shared/utils/strings';

import { BookReviewDto, BookReviewEntity } from './book-review.types';

export class BookReviewDtoMapper implements BaseMapper<BookReviewEntity, BookReviewDto> {
  toEntity(dto: BookReviewDto): BookReviewEntity {
    const {
      bookReviewId,
      workId,
      title,
      authorName,
      reviewerOrcid,
      reviewerInstitutionId,
      reviewerInstitution,
      url,
      doi,
      reviewDate,
      journalName,
      journalVolume,
      journalNumber,
      journalIssn,
      pageRange,
      text,
      reviewOrdinal,
    } = dto;

    return {
      id: bookReviewId,
      workId,
      title: title ?? '',
      authorName: authorName ?? '',
      reviewerOrcid: reviewerOrcid ?? '',
      reviewerInstitutionId: reviewerInstitutionId ?? '',
      reviewerInstitutionName: reviewerInstitution?.institutionName ?? '',
      reviewerInstitutionRor: reviewerInstitution?.ror ?? '',
      url: url ?? '',
      doi: doi ?? '',
      reviewDate: reviewDate ?? '',
      journalName: journalName ?? '',
      journalVolume: journalVolume ?? '',
      journalNumber: journalNumber ?? '',
      journalIssn: journalIssn ?? '',
      pageRange: pageRange ?? '',
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
      reviewerOrcid,
      reviewerInstitutionId,
      url,
      doi,
      reviewDate,
      journalName,
      journalVolume,
      journalNumber,
      journalIssn,
      pageRange,
      text,
      orderNumber,
    } = entity;

    return {
      bookReviewId: id,
      workId,
      title: emptyToNull(title),
      authorName: emptyToNull(authorName),
      reviewerOrcid: emptyToNull(reviewerOrcid),
      reviewerInstitutionId: emptyToNull(reviewerInstitutionId),
      url: emptyToNull(url),
      doi: emptyToNull(doi),
      reviewDate: emptyToNull(reviewDate),
      journalName: emptyToNull(journalName),
      journalVolume: emptyToNull(journalVolume),
      journalNumber: emptyToNull(journalNumber),
      journalIssn: emptyToNull(journalIssn),
      pageRange: emptyToNull(pageRange),
      text: emptyToNull(text),
      reviewOrdinal: orderNumber,
    };
  }
}
