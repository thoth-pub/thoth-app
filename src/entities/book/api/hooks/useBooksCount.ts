import { useQuery } from '@tanstack/react-query';

import type { Expression } from '@/gql/graphql';
import type { PublisherId } from '@/src/entities/publisher';
import { QueryKeys, useServices } from '@/src/shared';

type UseBooksCountProps = {
  publishersIds: PublisherId[];
  filter?: string;
  expression?: Expression;
  publishedAt?: string;
};

const useBooksCount = (props: UseBooksCountProps) => {
  const { publishersIds, filter, expression, publishedAt } = props;

  const { bookService } = useServices();

  const {
    data: bookCount = 0,
    error,
    isLoading,
  } = useQuery({
    queryKey: [QueryKeys.booksCount, ...publishersIds, filter, expression, publishedAt],
    queryFn: () => bookService.getBooksCount({ publishersIds, filter, expression, publishedAt }),
    enabled: publishersIds.length > 0,
  });

  return { bookCount, error, isLoading };
};

export default useBooksCount;
