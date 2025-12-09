import { Expression } from '@/gql/graphql';
import { useSuspenseBooksCount } from '@/src/entities/book';
import type { PublisherId } from '@/src/entities/publisher';

export const useBooksCountByMonth = (publishersIds: PublisherId[], date: string) => {
  const { bookCount = 0 } = useSuspenseBooksCount({
    publishersIds,
    publishedAt: date,
    expression: Expression.GreaterThan,
  });

  return { bookCount };
};
