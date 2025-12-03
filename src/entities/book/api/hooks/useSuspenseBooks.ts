import { Expression, WorkField, WorkStatus } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { appConfig, QueryKeys, type Direction } from '@/src/shared';

import { BookService } from '../book.service';
import { useSuspenseQuery } from '@tanstack/react-query';

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

const useSuspenseBooks = (props: UseBooksProps) => {
  const {
    publishersIds,
    offset = 0,
    limit = appConfig.data.itemsPerRequestLimit,
    direction,
    filter = '',
    workStatus,
    startedAt,
    expression,
    field = WorkField.UpdatedAtWithRelations,
    isAdmin = false,
  } = props;

  const {
    data: books = [],
    error,
    isLoading,
  } = useSuspenseQuery({
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

export default useSuspenseBooks;
