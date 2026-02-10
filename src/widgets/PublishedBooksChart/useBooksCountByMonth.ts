import { Expression } from '@/gql/graphql';
import { useBooksCount } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';

export const useBooksCountByMonth = (date: string) => {
  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher && activePublisher.id ? [activePublisher.id] : [];

  const { bookCount = 0 } = useBooksCount({
    publishersIds,
    publishedAt: date,
    expression: Expression.GreaterThan,
  });

  return { bookCount };
};
