import { useSuspenseQuery } from '@apollo/client/react';

import type { Expression } from '@/gql/graphql';
import type { PublisherId } from '@/src/entities/publisher';

import { GET_BOOKS_COUNT } from '../../model/book.schema';

const useBooksCount = (publishersIds: PublisherId[], filter = '', startedAt?: string, expression?: Expression) => {
  const { data: { bookCount } = { bookCount: 0 }, error } = useSuspenseQuery(GET_BOOKS_COUNT, {
    variables: { publishers: publishersIds, filter, ...(startedAt && expression ? { startedAt, expression } : {}) },
    skip: publishersIds.length === 0,
  });

  return { bookCount, error };
};

export default useBooksCount;
