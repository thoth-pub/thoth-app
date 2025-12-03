'use client';

import { PieChart } from '@mui/x-charts';

import {
  ChartWrapper,
  useSuspenseBooksCount,
  useForthcomingBooksCount,
  usePublishedBooksCount,
} from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useIsDesktop } from '@/src/shared/hooks';
import { DashboardContentWrapper, Typography } from '@/src/shared/ui';

const TotalBooksChart = () => {
  const { activePublisher } = usePublisherStateMachine();
  const isDesktop = useIsDesktop(1280);

  const { bookCount } = useSuspenseBooksCount({ publishersIds: activePublisher ? [activePublisher] : [] });
  const { bookCount: publishedBookCount } = usePublishedBooksCount(activePublisher ? [activePublisher] : []);
  const { bookCount: forthcomingBookCount } = useForthcomingBooksCount(activePublisher ? [activePublisher] : []);

  const otherBooksCount = bookCount - publishedBookCount - forthcomingBookCount;

  const chartData: { label: string; value: number; color: string }[] = [];

  if (publishedBookCount > 0) {
    chartData.push({ label: 'Active', value: publishedBookCount, color: 'var(--color-chart-4)' });
  }

  if (forthcomingBookCount > 0) {
    chartData.push({ label: 'Forthcoming', value: forthcomingBookCount, color: 'var(--color-chart-1)' });
  }

  if (otherBooksCount > 0) {
    chartData.push({ label: 'Other', value: otherBooksCount, color: 'var(--color-chart-3)' });
  }

  const settings = {
    width: isDesktop ? 130 : 95,
    height: isDesktop ? 130 : 95,
    margin: { right: 0 },
    hideLegend: true,
  };

  if (chartData.length === 0) {
    return null;
  }

  return (
    <DashboardContentWrapper>
      <ChartWrapper>
        <div className="flex flex-col justify-between">
          <Typography component="h2" variant="h2" className="mb-2">
            Catalogue Breakdown
          </Typography>
          <ul className="flex list-disc flex-col gap-1 pl-4 xl:pl-8">
            {publishedBookCount > 0 && (
              <Typography component="li" className="list-item marker:text-[var(--color-chart-4)]">
                {publishedBookCount} Active
              </Typography>
            )}
            {forthcomingBookCount > 0 && (
              <Typography component="li" className="list-item marker:text-[var(--color-chart-1)]">
                {forthcomingBookCount} Forthcoming
              </Typography>
            )}
            {otherBooksCount > 0 && (
              <Typography component="li" className="list-item marker:text-[var(--color-chart-3)]">
                {otherBooksCount} Other
              </Typography>
            )}
          </ul>
        </div>
        <div className="max-w-[130px]">
          <PieChart
            series={[{ innerRadius: isDesktop ? 40 : 30, outerRadius: isDesktop ? 60 : 45, data: chartData }]}
            {...settings}
          />
        </div>
      </ChartWrapper>
    </DashboardContentWrapper>
  );
};

export default TotalBooksChart;
