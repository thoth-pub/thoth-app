import { Expression, WorkStatus } from '@/gql/graphql';
import { useBooksCount } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';

type UseBooksCountByMonthProps = {
  date: string;
  workStatuses: WorkStatus[];
};

export const useBooksCountByMonth = (props: UseBooksCountByMonthProps) => {
  const { date, workStatuses } = props;

  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher && activePublisher.id ? [activePublisher.id] : [];

  const { bookCount = 0, isFetched } = useBooksCount({
    publishersIds,
    publishedAt: date,
    expression: Expression.GreaterThan,
    workStatuses,
  });

  return { bookCount, isFetched };
};
