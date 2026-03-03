import { useQuery } from '@tanstack/react-query';

import { Direction, WorkField, WorkStatus } from '@/gql/graphql';
import type { PublisherId } from '@/src/entities/publisher';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

const useLatestPublishedBooks = (publishersIds: PublisherId[]) => {
  const { bookService } = useServices();

  const {
    data = [],
    error,
    isLoading,
    isFetched,
  } = useQuery({
    queryKey: [QueryKeys.latestPublishedBooks, ...publishersIds],
    queryFn: () =>
      bookService.getBooks({
        publishersIds,
        limit: 3,
        workStatus: WorkStatus.Active,
        direction: Direction.Desc,
        field: WorkField.UpdatedAt,
      }),
    enabled: publishersIds.length > 0,
  });

  return { books: data, error, isLoading, isFetched };
};

export default useLatestPublishedBooks;
