import { useQuery } from '@tanstack/react-query';

import type { Expression, WorkField, WorkStatus } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { appConfig } from '@/src/shared/config';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { Direction } from '@/src/shared/types';

type UseBooksProps = {
  publishersIds: PublisherId[];
  offset?: number;
  limit?: number;
  direction?: Direction;
  filter?: string;
  workStatus?: WorkStatus;
  startedAt?: string;
  expression?: Expression;
  field?: WorkField;
};

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
  } = props;

  const { bookService } = useServices();

  const {
    data: books = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: [
      QueryKeys.books,
      ...publishersIds,
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
    enabled: publishersIds.length > 0,
  });

  return { books, error, isLoading };
};

export default useBooks;
