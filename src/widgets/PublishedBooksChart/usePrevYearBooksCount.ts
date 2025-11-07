'use client';

import { Expression } from '@/gql/graphql';
import { useBooks } from '@/src/entities/book';
import { PublisherId } from '@/src/entities/publisher';
import { getSameDayAndMonthDateInPast } from '@/src/shared';

export const usePrevYearBooksCount = (publishersIds: PublisherId[], isAdmin: boolean) => {
  const startDate = getSameDayAndMonthDateInPast(2);

  const { books } = useBooks({
    publishersIds,
    startedAt: startDate,
    expression: Expression.GreaterThan,
    limit: 1000,
    isAdmin,
  });

  return { bookCount: books.length };
};
