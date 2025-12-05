import type { Expression } from '@/gql/graphql';
import type { PublisherId } from '@/src/entities/publisher';

import { useSuspenseQuery } from '@tanstack/react-query';
import { QueryKeys, useServices } from '@/src/shared';

type UseBooksCountProps = {
  publishersIds: PublisherId[];
  isAdmin: boolean;
  filter?: string;
  expression?: Expression;
  publishedAt?: string;
};

const useBooksCount = (props: UseBooksCountProps) => {
  const { publishersIds, isAdmin = false, filter, expression, publishedAt } = props;

  const { bookService } = useServices();

  const {
    data: bookCount = 0,
    error,
    isLoading,
  } = useSuspenseQuery({
    queryKey: [QueryKeys.booksCount, ...publishersIds, isAdmin, filter, expression, publishedAt],
    queryFn: () => bookService.getBooksCount({ publishersIds, filter, expression, publishedAt }),
  });

  return { bookCount, error, isLoading };
};

export default useBooksCount;
