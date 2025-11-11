import { useSuspenseQuery } from '@apollo/client/react';

import type { Expression } from '@/gql/graphql';
import type { PublisherId } from '@/src/entities/publisher';

import { GET_BOOKS_COUNT } from '../../model/book.schema';

type UseSuspenseBooksCountProps = {
  publishersIds: PublisherId[];
  isAdmin: boolean;
  filter?: string;
  expression?: Expression;
  publishedAt?: string;
};

const useSuspenseBooksCount = (props: UseSuspenseBooksCountProps) => {
  const { publishersIds, isAdmin = false, filter, expression, publishedAt } = props;

  const { data: { bookCount } = { bookCount: 0 }, error } = useSuspenseQuery(GET_BOOKS_COUNT, {
    variables: {
      publishers: publishersIds,
      filter,
      ...(publishedAt && expression ? { publicationDate: { timestamp: publishedAt, expression } } : {}),
    },
    skip: publishersIds.length === 0 && !isAdmin,
  });

  return { bookCount, error };
};

export default useSuspenseBooksCount;
