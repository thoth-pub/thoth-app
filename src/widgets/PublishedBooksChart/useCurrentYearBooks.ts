'use client';

import { Expression } from '@/gql/graphql';
import { useBooks } from '@/src/entities/book';
import type { PublisherId } from '@/src/entities/publisher';
import { getSameDayAndMonthDateInPast } from '@/src/shared';

export const useCurrentYearBooks = (publishersIds: PublisherId[]) => {
  const startDate = getSameDayAndMonthDateInPast(1);

  const { books } = useBooks({ publishersIds, startedAt: startDate, expression: Expression.GreaterThan });

  return { bookCount: books.length, books };
};
