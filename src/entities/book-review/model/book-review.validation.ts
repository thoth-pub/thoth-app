import z from 'zod';

import { FORM_FIELDS } from '@/src/shared/constants';
import { optionalStringValidation, optionalUrlValidation } from '@/src/shared/utils';
import { doiValidation } from '@/src/shared/utils/validations';

const {
  BOOK_REVIEW_URL,
  BOOK_REVIEW_TITLE,
  BOOK_REVIEW_AUTHOR_NAME,
  BOOK_REVIEW_REVIEW_DATE,
  BOOK_REVIEW_JOURNAL_NAME,
  BOOK_REVIEW_JOURNAL_VOLUME,
  BOOK_REVIEW_JOURNAL_NUMBER,
  BOOK_REVIEW_JOURNAL_ISSN,
  BOOK_REVIEW_TEXT,
  DOI,
} = FORM_FIELDS;

export const bookReviewUrlValidationSchema = z.object({
  [BOOK_REVIEW_URL.name]: optionalUrlValidation,
});

export const bookReviewDoiValidationSchema = z.object({
  [DOI.name]: doiValidation,
});

export const bookReviewTitleValidationSchema = z.object({
  [BOOK_REVIEW_TITLE.name]: optionalStringValidation,
});

export const bookReviewAuthorNameValidationSchema = z.object({
  [BOOK_REVIEW_AUTHOR_NAME.name]: optionalStringValidation,
});

export const bookReviewReviewDateValidationSchema = z.object({
  [BOOK_REVIEW_REVIEW_DATE.name]: optionalStringValidation,
});

export const bookReviewJournalNameValidationSchema = z.object({
  [BOOK_REVIEW_JOURNAL_NAME.name]: optionalStringValidation,
});

export const bookReviewJournalVolumeValidationSchema = z.object({
  [BOOK_REVIEW_JOURNAL_VOLUME.name]: optionalStringValidation,
});

export const bookReviewJournalNumberValidationSchema = z.object({
  [BOOK_REVIEW_JOURNAL_NUMBER.name]: optionalStringValidation,
});

export const bookReviewJournalIssnValidationSchema = z.object({
  [BOOK_REVIEW_JOURNAL_ISSN.name]: optionalStringValidation,
});

export const bookReviewTextValidationSchema = z.object({
  [BOOK_REVIEW_TEXT.name]: optionalStringValidation,
});
