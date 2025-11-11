import { Expression } from '@/gql/graphql';
import { useSuspenseBooksCount } from '@/src/entities/book';
import type { PublisherId } from '@/src/entities/publisher';

export const useBooksCountByMonth = (publishersIds: PublisherId[], isAdmin: boolean, date: string) => {
  const { bookCount = 0 } = useSuspenseBooksCount({
    publishersIds,
    isAdmin,
    publishedAt: date,
    expression: Expression.GreaterThan,
  });

  return { bookCount };
};
