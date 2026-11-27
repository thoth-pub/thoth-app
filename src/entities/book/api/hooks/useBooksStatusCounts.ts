import { useQuery } from '@tanstack/react-query';

import type { PublisherId } from '@/src/entities/publisher';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

// Total, active and forthcoming counts in one request, instead of three.
const useBooksStatusCounts = (publishersIds: PublisherId[]) => {
  const { bookService } = useServices();

  const {
    data,
    error,
    isLoading,
    isFetched,
  } = useQuery({
    queryKey: [QueryKeys.booksStatusCounts, ...publishersIds],
    queryFn: () => bookService.getBooksStatusCounts({ publishersIds }),
    enabled: publishersIds.length > 0,
  });

  const { total = 0, active = 0, forthcoming = 0 } = data ?? {};

  return { total, active, forthcoming, error, isLoading, isFetched };
};

export default useBooksStatusCounts;
