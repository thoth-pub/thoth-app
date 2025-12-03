import type { PublisherId } from '@/src/entities/publisher';
import { QueryKeys, WorkStatuses } from '@/src/shared';
import { useSuspenseQuery } from '@tanstack/react-query';
import { BookService } from '../book.service';

const bookService = new BookService();

const useForthcomingBooksCount = (publishersIds: PublisherId[]) => {
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
