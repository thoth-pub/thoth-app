import { useSuspenseQuery } from '@apollo/client/react';

import type { Expression } from '@/gql/graphql';
import type { PublisherId } from '@/src/entities/publisher';

import { GET_BOOKS_COUNT } from '../../model/book.schema';

type UseBooksCountProps = {
  publishersIds: PublisherId[];
  isAdmin: boolean;
  filter?: string;
  startedAt?: string;
  expression?: Expression;
};

const useBooksCount = (props: UseBooksCountProps) => {
  const { publishersIds, isAdmin = false, filter, startedAt, expression } = props;

  const { data: { bookCount } = { bookCount: 0 }, error } = useSuspenseQuery(GET_BOOKS_COUNT, {
    variables: { publishers: publishersIds, filter, ...(startedAt && expression ? { startedAt, expression } : {}) },
    skip: publishersIds.length === 0 && !isAdmin,
  });

  return { bookCount, error };
};

export default useBooksCount;
