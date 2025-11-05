'use client';

import ArrowDropUpRoundedIcon from '@mui/icons-material/ArrowDropUpRounded';
import { BarChart } from '@mui/x-charts';
import dayjs from 'dayjs';

import { ChartWrapper } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useIsDesktop } from '@/src/shared/hooks';
import { DashboardContentWrapper, Typography } from '@/src/shared/ui';

import { useCurrentYearBooks } from './useCurrentYearBooks';
import { usePrevYearBooksCount } from './usePrevYearBooksCount';

const PublishedBooksChart = () => {
  const isDesktop = useIsDesktop();
  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher ? [activePublisher] : [];

  const { bookCount, books } = useCurrentYearBooks(publishersIds);
  const { bookCount: prevYearBooksCount } = usePrevYearBooksCount(publishersIds);

  const diff = prevYearBooksCount - bookCount;

  const chartData: Record<string, { value: number; month: string }> = {};

  books.forEach(({ updatedAt }) => {
    if (!dayjs(updatedAt).isValid()) return;

    const monthNumber = dayjs(updatedAt).month();
    const monthName = dayjs(updatedAt).format('MMM');

    if (chartData[monthNumber]) {
      chartData[monthNumber].value++;
      return;
    }

    chartData[monthNumber] = { value: 1, month: monthName };
  });

  const sortedData = Object.entries(chartData).sort((a, b) => +a - +b);

  const axisData = sortedData.map(([_, { month }]) => month).slice(-5);
  const seriesData = sortedData.map(([_, { value }]) => value).slice(-5);

  if (sortedData.length === 0) {
    return null;
  }

  return (
    <DashboardContentWrapper>
      <ChartWrapper>
        <div className="flex flex-col justify-between">
          <Typography component="h2" variant="h2" className="mb-2">
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

        <BarChart
          xAxis={[
            {
              data: axisData,
              position: 'none',
              colorMap: {
                type: 'ordinal',
                colors: [
                  'var(--color-chart-1)',
                  'var(--color-chart-2)',
                  'var(--color-chart-3)',
                  'var(--color-chart-4)',
                  'var(--color-chart-5)',
                ],
              },
            },
          ]}
          yAxis={[
            {
              position: 'none',
              width: 10,
            },
          ]}
          series={[{ data: seriesData }]}
          height={isDesktop ? 127 : 95}
          width={isDesktop ? seriesData.length * 75 : seriesData.length * 55}
          sx={{
            marginTop: 'auto',
            position: 'relative',
            maxWidth: 'fit-content',
            bottom: '-20px',
            '& .MuiChartsWrapper-root': {
              width: 'fit-content',
              maxWidth: 'fit-content',
            },
          }}
          hideLegend
        />
      </ChartWrapper>
    </DashboardContentWrapper>
  );
};

export default PublishedBooksChart;
