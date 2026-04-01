import { useQuery } from '@tanstack/react-query';

import type { Expression } from '@/gql/graphql';
import type { PublisherId } from '@/src/entities/publisher';
import type { WorkStatus } from '@/src/entities/work/model/work.types';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

type UseBooksCountProps = {
  publishersIds: PublisherId[];
  filter?: string;
  expression?: Expression;
  publishedAt?: string;
  workStatus?: WorkStatus;
  workStatuses?: WorkStatus[];
};

const useBooksCount = (props: UseBooksCountProps) => {
  const { publishersIds, filter, expression, publishedAt, workStatus, workStatuses = [] } = props;

  const { bookService } = useServices();

  const {
    data: bookCount = 0,
    error,
    isLoading,
    isFetched,
  } = useQuery({
    queryKey: [QueryKeys.booksCount, ...publishersIds, filter, expression, publishedAt, workStatus, ...workStatuses],
    queryFn: () =>
      bookService.getBooksCount({ publishersIds, filter, expression, publishedAt, workStatus, workStatuses }),
    enabled: publishersIds.length > 0,
  });

  return { bookCount, error, isLoading, isFetched };
};

export default useBooksCount;
