import { useQuery } from '@tanstack/react-query';

import type { PublisherId } from '@/src/entities/publisher';
import type { WorkStatus } from '@/src/entities/work/model/work.types';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

type UseBooksCountsByMonthProps = {
  publishersIds: PublisherId[];
  dates: string[];
  workStatuses?: WorkStatus[];
};

// One request for every date, instead of one request per date.
const useBooksCountsByMonth = (props: UseBooksCountsByMonthProps) => {
  const { publishersIds, dates, workStatuses = [] } = props;

  const { bookService } = useServices();

  const {
    data: counts,
    error,
    isLoading,
    isFetched,
  } = useQuery({
    queryKey: [QueryKeys.booksCountsByMonth, ...publishersIds, ...dates, ...workStatuses],
    queryFn: () => bookService.getBooksCountsByDates({ publishersIds, dates, workStatuses }),
    enabled: publishersIds.length > 0,
  });

  return { counts, error, isLoading, isFetched };
};

export default useBooksCountsByMonth;
