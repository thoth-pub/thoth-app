import type { PublisherId } from '@/src/entities/publisher';
import { useSuspenseQuery } from '@tanstack/react-query';
import { QueryKeys, useServices, WorkStatuses } from '@/src/shared';

const usePublishedBooksCount = (publishersIds: PublisherId[]) => {
  const { bookService } = useServices();

  const {
    data: bookCount,
    error,
    isLoading,
  } = useSuspenseQuery({
    queryKey: [QueryKeys.publishedBooksCount, ...publishersIds],
    queryFn: () => bookService.getBooksCount({ publishersIds, workStatus: WorkStatuses.enum.Active }),
  });

  return { bookCount, error, isLoading };
};

export default usePublishedBooksCount;
