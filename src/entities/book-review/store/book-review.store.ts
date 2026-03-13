'use client';

import { createEntityStateMachine } from '@/src/shared/store';

import type { BookReviewEntity } from '../model/book-review.types';

export const { useStateMachine: useBookReviewStateMachine, StateMachineContext: BookReviewStateMachineContext } =
  createEntityStateMachine<BookReviewEntity>('bookReviewEditor');
