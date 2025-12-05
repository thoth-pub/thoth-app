import { useSuspenseQuery } from '@tanstack/react-query';

import type { PublisherId } from '@/src/entities/publisher';
import { QueryKeys, useServices, WorkStatuses } from '@/src/shared';

const useForthcomingBooksCount = (publishersIds: PublisherId[]) => {
  const { bookService } = useServices();

  const {
    data: bookCount = 0,
    error,
    isLoading,
  } = useSuspenseQuery({
    queryKey: [QueryKeys.forthcomingBooksCount, ...publishersIds],
    queryFn: () => bookService.getBooksCount({ publishersIds, workStatus: WorkStatuses.enum.Forthcoming }),
  });

  return { bookCount, error, isLoading };
};

export default useForthcomingBooksCount;
