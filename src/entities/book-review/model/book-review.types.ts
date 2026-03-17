import type z from 'zod';

import type { BookReviewFragmentFragment } from '@/gql/graphql';

import type { bookReviewReviewDateValidationSchema } from './book-review.validation';

export type BookReviewDto = BookReviewFragmentFragment;

export type BookReviewId = string;

export type BookReviewEntity = {
  id: BookReviewId;
  workId: string;
  title: string;
  authorName: string;
  url: string;
  doi: string;
  reviewDate: string;
  journalName: string;
  journalVolume: string;
  journalNumber: string;
  journalIssn: string;
  text: string;
  orderNumber: number;
};

export type BookReviewReviewDateForm = z.infer<typeof bookReviewReviewDateValidationSchema>;
