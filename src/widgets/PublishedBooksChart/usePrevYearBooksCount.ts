'use client';

import { Expression } from '@/gql/graphql';
import { useBooksCount } from '@/src/entities/book';
import { PublisherId } from '@/src/entities/publisher';
import { getSameDayAndMonthDateInPast } from '@/src/shared';

export const usePrevYearBooksCount = (publishersIds: PublisherId[]) => {
  const startDate = getSameDayAndMonthDateInPast(2);

  const { bookCount } = useBooksCount(publishersIds, '', startDate, Expression.GreaterThan);

  return { bookCount };
};
