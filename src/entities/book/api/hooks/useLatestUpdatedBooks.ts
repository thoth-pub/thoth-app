import { useQuery } from '@tanstack/react-query';

import { Direction, WorkField } from '@/gql/graphql';
import type { PublisherId } from '@/src/entities/publisher';
import { QueryKeys, useServices } from '@/src/shared';

const useLatestUpdatedBooks = (publishersIds: PublisherId[]) => {
  const { bookService } = useServices();

  const {
    data = [],
    error,
    isLoading,
    isFetched,
  } = useQuery({
    queryKey: [QueryKeys.latestUpdatedBooks, ...publishersIds],
    queryFn: () =>
      bookService.getBooks({
        publishersIds,
        limit: 3,
        direction: Direction.Desc,
        field: WorkField.UpdatedAtWithRelations,
      }),
    enabled: publishersIds.length > 0,
  });

  return { books: data, error, isLoading, isFetched };
};

export default useLatestUpdatedBooks;
