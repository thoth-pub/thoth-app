'use client';

import { PieChart } from '@mui/x-charts';

import { usePublisherStateMachine } from '@/src/entities/publisher';
import { Typography } from '@/src/shared/ui';

import useBooksCount from '../../api/hooks/useBooksCount';
import useForthcomingBooksCount from '../../api/hooks/useForthcomingBooksCount';
import usePublishedBooksCount from '../../api/hooks/usePublishedBooksCount';
import { ChartWrapper } from '../components/ChartWrapper/ChartWrapper';

const TotalBooksChart = () => {
  const { activePublisher } = usePublisherStateMachine();
  const { bookCount } = useBooksCount(activePublisher ? [activePublisher] : []);
  const { bookCount: publishedBookCount } = usePublishedBooksCount(activePublisher ? [activePublisher] : []);
  const { bookCount: forthcomingBookCount } = useForthcomingBooksCount(activePublisher ? [activePublisher] : []);

  const otherBooksCount = bookCount - publishedBookCount - forthcomingBookCount;

  const chartData: { label: string; value: number; color: string }[] = [];

  if (publishedBookCount > 0) {
    chartData.push({ label: 'Published', value: publishedBookCount, color: 'var(--color-primary)' });
  }

  if (forthcomingBookCount > 0) {
    chartData.push({ label: 'Resume', value: forthcomingBookCount, color: 'var(--color-success)' });
  }

  if (otherBooksCount > 0) {
    chartData.push({ label: 'Other', value: otherBooksCount, color: 'gray' });
  }

  const settings = {
    width: 130,
    height: 130,
    margin: { right: 0 },
    hideLegend: true,
  };

  return (
    <ChartWrapper>
      <div className="flex flex-col justify-between">
        <Typography component="h2" variant="h2" color="primary" className="mb-2">
          Statuses
        </Typography>
        <ul className="flex list-disc flex-col gap-1 pl-8">
          {publishedBookCount > 0 && (
            <Typography component="li" variant="body1" color="primary" className="list-item">
              {publishedBookCount} Published
            </Typography>
          )}
          {forthcomingBookCount > 0 && (
            <Typography component="li" variant="body1" color="success" className="list-item">
              {forthcomingBookCount} Resume
            </Typography>
          )}
          {otherBooksCount > 0 && (
            <Typography component="li" variant="body1" color="gray  ">
              {otherBooksCount} Other
            </Typography>
          )}
        </ul>
      </div>
      <div className="max-w-[130px]">
        <PieChart series={[{ innerRadius: 40, outerRadius: 60, data: chartData }]} {...settings} />
      </div>
    </ChartWrapper>
  );
};

export default TotalBooksChart;
