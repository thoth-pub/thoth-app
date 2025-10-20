'use client';

import { Expression } from '@/gql/graphql';
import { useBooksCount } from '@/src/entities/book';
import type { PublisherId } from '@/src/entities/publisher';
import { getSameDayAndMonthDateInPast } from '@/src/shared';

export const useCurrentYearBooksCount = (publishersIds: PublisherId[]) => {
  const startDate = getSameDayAndMonthDateInPast(1);

  const { bookCount } = useBooksCount(publishersIds, '', startDate, Expression.GreaterThan);

  return { bookCount };
};
