import { useSuspenseQuery } from '@apollo/client/react';

import { WorkStatus } from '@/gql/graphql';
import { GET_BOOKS_COUNT } from '@/src/entities/book/model/book.schema';
import type { PublisherId } from '@/src/entities/publisher';

const usePublishedBooksCount = (publishersIds: PublisherId[]) => {
  const { data: { bookCount } = { bookCount: 0 }, error } = useSuspenseQuery(GET_BOOKS_COUNT, {
    variables: { publishers: publishersIds, workStatus: WorkStatus.Active },
    skip: publishersIds.length === 0,
  });

  return { bookCount, error };
};

export default usePublishedBooksCount;
