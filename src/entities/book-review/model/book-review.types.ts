import type z from 'zod';

import type { BookReviewFragmentFragment } from '@/gql/graphql';

import type {
  bookReviewReviewDateValidationSchema,
  bookReviewReviewerInstitutionValidationSchema,
  bookReviewReviewerOrcidValidationSchema,
} from './book-review.validation';

export type BookReviewDto = BookReviewFragmentFragment;

export type BookReviewId = string;

export type BookReviewEntity = {
  id: BookReviewId;
  workId: string;
  title: string;
  authorName: string;
  reviewerOrcid: string;
  reviewerInstitutionId: string;
  reviewerInstitutionName: string;
  reviewerInstitutionRor: string;
  url: string;
  doi: string;
  reviewDate: string;
  journalName: string;
  journalVolume: string;
  journalNumber: string;
  journalIssn: string;
  pageRange: string;
  text: string;
  orderNumber: number;
};

export type BookReviewReviewDateForm = z.infer<typeof bookReviewReviewDateValidationSchema>;

export type BookReviewReviewerOrcidForm = z.infer<typeof bookReviewReviewerOrcidValidationSchema>;

export type BookReviewReviewerInstitutionForm = z.infer<typeof bookReviewReviewerInstitutionValidationSchema>;