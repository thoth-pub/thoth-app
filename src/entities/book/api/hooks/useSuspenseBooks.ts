import { useSuspenseQuery } from '@apollo/client/react';

import { Expression, WorkField, WorkFragmentFragment, WorkStatus } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { appConfig, type Direction } from '@/src/shared';

import { BookDtoMapper } from '../../model/book.mapper';
import { GET_BOOKS } from '../../model/book.schema';

const mapper = new BookDtoMapper();

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

  const { data: { books } = { books: [] }, error } = useSuspenseQuery(GET_BOOKS, {
    variables: {
      offset,
      limit,
      publishers: publishersIds,
      direction,
      filter,
      workStatus,
      field,
      ...(startedAt && expression ? { startedAt, expression } : {}),
    },
    skip: publishersIds.length === 0 && !isAdmin,
  });

  const data = books.map((book) => mapper.toEntity(book as WorkFragmentFragment));

  return { books: data, error };
};

export default useSuspenseBooks;
