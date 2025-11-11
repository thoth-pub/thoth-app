'use client';

import { Expression } from '@/gql/graphql';
import { useBooksCount } from '@/src/entities/book';
import { PublisherId } from '@/src/entities/publisher';
import { getSameDayAndMonthDateInPast } from '@/src/shared';

export const usePrevYearBooksCount = (publishersIds: PublisherId[], isAdmin: boolean) => {
  const startDate = getSameDayAndMonthDateInPast(2);

  const { bookCount = 0 } = useBooksCount({
    publishersIds,
    startedAt: startDate,
    expression: Expression.GreaterThan,
    isAdmin,
  });

  return { bookCount };
};
