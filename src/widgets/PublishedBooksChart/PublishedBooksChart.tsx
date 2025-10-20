'use client';

import ArrowDropUpRoundedIcon from '@mui/icons-material/ArrowDropUpRounded';

import { ChartWrapper } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { DashboardContentWrapper, Typography } from '@/src/shared/ui';

import { useCurrentYearBooksCount } from './useCurrentYearBooksCount';
import { usePrevYearBooksCount } from './usePrevYearBooksCount';

const PublishedBooksChart = () => {
  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher ? [activePublisher] : [];

  const { bookCount } = useCurrentYearBooksCount(publishersIds);
  const { bookCount: prevYearBooksCount } = usePrevYearBooksCount(publishersIds);

  const diff = prevYearBooksCount - bookCount;

  return (
    <DashboardContentWrapper>
      <ChartWrapper>
        <div className="flex flex-col justify-between">
          <Typography component="h2" variant="h2" color="primary" className="mb-2">
            Published
          </Typography>
          <ul className="flex flex-col gap-1">
            <Typography component="li" variant="body1" color="primary">
              Last 12 months: {bookCount} {bookCount > 0 && <ArrowDropUpRoundedIcon color="success" fontSize="large" />}
            </Typography>
            <Typography component="li" variant="body1" color="primary">
              Previous 12 months: {diff}
            </Typography>
          </ul>
        </div>

        <img alt="chart-icon" src="/chart.svg" width={216} height={127} />
      </ChartWrapper>
    </DashboardContentWrapper>
  );
};

export default PublishedBooksChart;
