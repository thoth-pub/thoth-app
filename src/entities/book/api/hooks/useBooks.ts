import type { Expression, WorkField, WorkStatus } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { appConfig, QueryKeys, type Direction } from '@/src/shared';

import { useQuery } from '@tanstack/react-query';
import { BookService } from '../book.service';

type UseBooksProps = {
  publishersIds: PublisherId[];
  isAdmin: boolean;
  offset?: number;
  limit?: number;
  direction?: Direction;
  filter?: string;
  workStatus?: WorkStatus;
  startedAt?: string;
  expression?: Expression;
  field?: WorkField;
};

const bookService = new BookService();

const useBooks = (props: UseBooksProps) => {
  const {
    publishersIds,
    offset = 0,
    limit = appConfig.data.itemsPerRequestLimit,
    direction,
    filter = '',
    workStatus,
    startedAt,
    expression,
    field,
    isAdmin = false,
  } = props;

  const {
    data: books = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: [
      QueryKeys.books,
      ...publishersIds,
      isAdmin,
      offset,
      limit,
      direction,
      filter,
      workStatus,
      startedAt,
      expression,
      field,
    ],
    queryFn: () =>
      bookService.getBooks({
        publishersIds,
        offset,
        limit,
        direction,
        filter,
        workStatus,
        startedAt,
        expression,
        field,
      }),
  });

  return { books, error, isLoading };
};

export default useBooks;
