import { useQuery } from '@tanstack/react-query';

import type { PublisherId } from '@/src/entities/publisher';
import { QueryKeys, useServices, WorkStatuses } from '@/src/shared';

const usePublishedBooksCount = (publishersIds: PublisherId[]) => {
  const { bookService } = useServices();

  const {
    data: bookCount = 0,
    error,
    isLoading,
  } = useQuery({
    queryKey: [QueryKeys.publishedBooksCount, ...publishersIds],
    queryFn: () => bookService.getBooksCount({ publishersIds, workStatus: WorkStatuses.enum.Active }),
    enabled: publishersIds.length > 0,
  });

  return { bookCount, error, isLoading };
};

export default usePublishedBooksCount;
