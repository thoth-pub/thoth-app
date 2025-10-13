import { useQuery } from '@apollo/client/react';

import type { WorkFragmentFragment } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { appConfig, type Direction } from '@/src/shared';

import { BookDtoMapper } from '../../model/book.mapper';
import { GET_BOOKS } from '../../model/book.schema';

const mapper = new BookDtoMapper();

type UseBooksProps = {
  publishersIds: PublisherId[];
  offset?: number;
  limit?: number;
  direction?: Direction;
  filter?: string;
};

const useBooks = (props: UseBooksProps) => {
  const { publishersIds, offset = 0, limit = appConfig.data.itemsPerRequestLimit, direction, filter = '' } = props;

  const {
    data: { books } = { books: [] },
    error,
    loading,
  } = useQuery(GET_BOOKS, {
    variables: { offset, limit, publishers: publishersIds, direction, filter },
    skip: publishersIds.length === 0,
  });

  const data = books.map((book) => mapper.toEntity(book as WorkFragmentFragment));

  return { books: data, error, loading };
};

export default useBooks;
