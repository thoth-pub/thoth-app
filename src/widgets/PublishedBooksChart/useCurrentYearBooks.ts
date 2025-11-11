'use client';

import { Expression } from '@/gql/graphql';
import { useBooks, useSuspenseBooks } from '@/src/entities/book';
import type { PublisherId } from '@/src/entities/publisher';
import { getSameDayAndMonthDateInPast } from '@/src/shared';

export const useCurrentYearBooks = (publishersIds: PublisherId[], isAdmin: boolean) => {
  const startDate = getSameDayAndMonthDateInPast(1);

  const { books } = useSuspenseBooks({
    publishersIds,
    startedAt: startDate,
    expression: Expression.GreaterThan,
    limit: 1000,
    isAdmin,
  });

  return { bookCount: books.length, books };
};
