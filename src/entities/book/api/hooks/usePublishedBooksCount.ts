import type { PublisherId } from '@/src/entities/publisher';
import { useSuspenseQuery } from '@tanstack/react-query';
import { QueryKeys, WorkStatuses } from '@/src/shared';
import { BookService } from '../book.service';

const bookService = new BookService();

const usePublishedBooksCount = (publishersIds: PublisherId[]) => {
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
