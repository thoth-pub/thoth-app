'use client';

import { PieChart } from '@mui/x-charts';

import { usePublisherStateMachine } from '@/src/entities/publisher';
import { Typography } from '@/src/shared/ui';

import { ChartWrapper } from '../components/ChartWrapper/ChartWrapper';

const PublishedBooksChart = () => {
  const { activePublisher } = usePublisherStateMachine();

  const chartData = [
    { label: 'Published', value: 1, color: 'var(--color-primary)' },
    { label: 'Resume', value: 2, color: 'var(--color-success)' },
    { label: 'Other', value: 3, color: 'gray' },
  ];

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
          Published
        </Typography>
        <ul className="flex flex-col gap-1">
          <Typography component="li" variant="body1" color="primary">
            Last 12 months: $number
          </Typography>
          <Typography component="li" variant="body1" color="primary">
            Previous 12 months: $number
          </Typography>
        </ul>
      </div>
      <div className="max-w-[130px]">
        <PieChart series={[{ innerRadius: 40, outerRadius: 60, data: chartData }]} {...settings} />
      </div>
    </ChartWrapper>
  );
};

export default PublishedBooksChart;
