import { useBooksCountsByMonth as useBooksCountsByMonthQuery } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import type { WorkStatus } from '@/src/entities/work/model/work.types';

type UseBooksCountsByMonthProps = {
  dates: string[];
  workStatuses: WorkStatus[];
};

// Counts of books published after each date, for the active publisher, in one request.
export const useBooksCountsByMonth = (props: UseBooksCountsByMonthProps) => {
  const { dates, workStatuses } = props;

  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher && activePublisher.id ? [activePublisher.id] : [];

  const { counts = [], isFetched } = useBooksCountsByMonthQuery({ publishersIds, dates, workStatuses });

  return { counts, isFetched };
};
