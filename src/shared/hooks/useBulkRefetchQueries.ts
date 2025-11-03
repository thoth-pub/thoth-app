import { Direction, Expression, WorkStatus } from '@/gql/graphql';
import { GET_BOOKS } from '@/src/entities/book/model/book.schema';
import { GET_BOOKS_COUNT } from '@/src/entities/book/model/book.schema';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { GET_WORKS_COUNT } from '@/src/entities/work/model/work.schema';
import { GET_WORKS } from '@/src/entities/work/model/work.schema';

import { getSameDayAndMonthDateInPast } from '../utils';

// TODO replace with client refetch

const useBulkRefetchQueries = () => {
  const { activePublisher } = usePublisherStateMachine();
  const startDate = getSameDayAndMonthDateInPast(1);

  const queries = [
    { query: GET_WORKS },
    { query: GET_WORKS_COUNT },
    { query: GET_BOOKS },
    { query: GET_BOOKS_COUNT },
    {
      query: GET_BOOKS,
      variables: { publishers: [activePublisher], startedAt: startDate, expression: Expression.GreaterThan },
    },
    { query: GET_BOOKS_COUNT, variables: { publishers: [activePublisher], workStatus: WorkStatus.Active } },
    { query: GET_BOOKS_COUNT, variables: { publishers: [activePublisher], workStatus: WorkStatus.Forthcoming } },
    { query: GET_BOOKS, variables: { publishers: [activePublisher], limit: 3, direction: Direction.Desc } },
    {
      query: GET_BOOKS,
      variables: {
        publishers: [activePublisher],
        workStatus: WorkStatus.Active,
        limit: 3,
        direction: Direction.Desc,
      },
    },
  ];

  return queries;
};

export default useBulkRefetchQueries;
