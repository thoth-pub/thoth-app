'use client';

import ArrowDropUpRoundedIcon from '@mui/icons-material/ArrowDropUpRounded';

import { ChartWrapper } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useIsDesktop } from '@/src/shared/hooks';
import { DashboardContentWrapper, Typography } from '@/src/shared/ui';

import { useCurrentYearBooksCount } from './useCurrentYearBooksCount';
import { usePrevYearBooksCount } from './usePrevYearBooksCount';

const PublishedBooksChart = () => {
  const isDesktop = useIsDesktop();
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
            <Typography component="li" variant="body1">
              {isDesktop ? 'Last 12 months:' : 'This year:'} {bookCount}{' '}
              {bookCount > 0 && <ArrowDropUpRoundedIcon color="success" fontSize={isDesktop ? 'large' : 'small'} />}
            </Typography>
            <Typography component="li" variant="body1">
              {isDesktop ? 'Previous 12 months:' : 'Prev year:'} {diff}
            </Typography>
          </ul>
        </div>

        <img alt="chart-icon" src="/chart.svg" width={isDesktop ? 216 : 162} height={isDesktop ? 127 : 95} />
      </ChartWrapper>
    </DashboardContentWrapper>
  );
};

export default PublishedBooksChart;
