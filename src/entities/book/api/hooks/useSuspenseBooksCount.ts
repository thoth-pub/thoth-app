import type { Expression } from '@/gql/graphql';
import type { PublisherId } from '@/src/entities/publisher';

import { useSuspenseQuery } from '@tanstack/react-query';
import { QueryKeys, useServices } from '@/src/shared';

type UseSuspenseBooksCountProps = {
  publishersIds: PublisherId[];
  filter?: string;
  expression?: Expression;
  publishedAt?: string;
};

const useSuspenseBooksCount = (props: UseSuspenseBooksCountProps) => {
  const { publishersIds, filter, expression, publishedAt } = props;

  const { bookService } = useServices();

  const { data: bookCount = 0, error } = useSuspenseQuery({
    queryKey: [QueryKeys.booksCount, ...publishersIds, filter, expression, publishedAt],
    queryFn: () => bookService.getBooksCount({ publishersIds, filter, expression, publishedAt }),
  });

  return { bookCount, error };
};

export default useSuspenseBooksCount;
