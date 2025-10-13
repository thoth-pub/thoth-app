import { useSuspenseQuery } from '@apollo/client/react';

import type { PublisherId } from '@/src/entities/publisher';

import { GET_BOOKS_COUNT } from '../../model/book.schema';

const useWorksCount = (publishersIds: PublisherId[], filter: string) => {
  const { data: { bookCount } = { bookCount: 0 }, error } = useSuspenseQuery(GET_BOOKS_COUNT, {
    variables: { publishers: publishersIds, filter },
    skip: publishersIds.length === 0,
  });

  return { bookCount, error };
};

export default useWorksCount;
