import { useQuery } from '@tanstack/react-query';

import type { PublisherId } from '@/src/entities/publisher';
import { QueryKeys, WorkStatuses } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

const useForthcomingBooksCount = (publishersIds: PublisherId[]) => {
  const { bookService } = useServices();

  const {
    data: bookCount = 0,
    error,
    isLoading,
    isFetched,
  } = useQuery({
    queryKey: [QueryKeys.forthcomingBooksCount, ...publishersIds],
    queryFn: () => bookService.getBooksCount({ publishersIds, workStatus: WorkStatuses.enum.Forthcoming }),
    enabled: publishersIds.length > 0,
  });

  return { bookCount, error, isLoading, isFetched };
};

export default useForthcomingBooksCount;
