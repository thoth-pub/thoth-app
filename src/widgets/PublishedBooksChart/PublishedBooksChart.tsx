'use client';

import ArrowDropUpRoundedIcon from '@mui/icons-material/ArrowDropUpRounded';
import { BarChart } from '@mui/x-charts';

import { ChartWrapper } from '@/src/entities/book';
import { WorkStatuses } from '@/src/shared/constants';
import { useIsDesktop, useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { CircularProgress, DashboardGridItem, TranslatedContent, Typography } from '@/src/shared/ui';
import { getMonthName, getStartOfTheCurrentMonthDate, getYear, substractMonthesFromDate } from '@/src/shared/utils';

import { useBooksCountsByMonth } from './useBooksCountsByMonth';

const includedWorkStatuses = [WorkStatuses.enum.Active, WorkStatuses.enum.Superseded, WorkStatuses.enum.Withdrawn];

const PublishedBooksChart = () => {
  const isDesktop = useIsDesktop(1280);
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });

  // Index 0 is the current month, 1 to 11 the previous months, 12 the same moment one year before the 12-month window.
  const firstMonthDate = getStartOfTheCurrentMonthDate();
  const monthDates = [firstMonthDate];
  for (let i = 1; i < 12; i += 1) {
    monthDates.push(substractMonthesFromDate(monthDates[i - 1], 1));
  }
  const prevYearBooksDate = substractMonthesFromDate(firstMonthDate, 24);
  const dates = [...monthDates, prevYearBooksDate];

  const { counts, isFetched } = useBooksCountsByMonth({ dates, workStatuses: includedWorkStatuses });

  const countAt = (index: number) => counts[index] ?? 0;

  const prevYearBooksCount = countAt(12);
  const currentYearBooksCount = countAt(11);
  const diff = prevYearBooksCount - currentYearBooksCount;

  // Counts are cumulative ("published after the date"), so a month's books are the
  // difference with the next older month. The current month keeps its own count.
  const chartData: Record<string, { value: number; month: string }> = {};
  for (let i = 11; i >= 0; i -= 1) {
    const monthDate = monthDates[i];
    chartData[monthDate] = {
      value: i === 0 ? countAt(0) : countAt(i) - countAt(i - 1),
      month: i === 11 ? `${t(getMonthName(monthDate))} ${getYear(monthDate)}` : t(getMonthName(monthDate)),
    };
  }

  const isLoading = !isFetched;

  const axisData = Object.values(chartData).map(({ month }) => month);
  const seriesData = Object.values(chartData).map(({ value }) => value);

  const isEmpty = seriesData.every((value) => value === 0);

  if (isLoading) {
    return (
      <DashboardGridItem>
        <ChartWrapper>
          <CircularProgress className="m-auto h-full" />
        </ChartWrapper>
      </DashboardGridItem>
    );
  }

  if (isEmpty) {
    return (
      <DashboardGridItem>
        <ChartWrapper>
          <div className="flex w-full flex-col gap-1">
            <Typography component="h2" variant="h2" className="mb-2">
              <TranslatedContent content="widgets.published" namespace={NAMESPACES.enum.dashboard} />
            </Typography>
            <Typography className="m-auto">
              <TranslatedContent content="widgets.empty" namespace={NAMESPACES.enum.dashboard} />
            </Typography>
          </div>
        </ChartWrapper>
      </DashboardGridItem>
    );
  }

  return (
    <DashboardGridItem>
      <ChartWrapper>
        <div className="flex flex-col justify-between">
          <Typography component="h2" variant="h2" className="mb-2">
            <TranslatedContent content="widgets.published" namespace={NAMESPACES.enum.dashboard} />
          </Typography>
          <ul className="flex flex-col gap-1">
            <Typography component="li" className="capitalize">
              <TranslatedContent
                content={isDesktop ? 'widgets.last 12 months' : 'widgets.this year'}
                namespace={NAMESPACES.enum.dashboard}
              />
              : {currentYearBooksCount}{' '}
              {diff > 0 && <ArrowDropUpRoundedIcon color="success" fontSize={isDesktop ? 'large' : 'small'} />}
            </Typography>
            <Typography component="li" className="capitalize">
              <TranslatedContent
                content={isDesktop ? 'widgets.previous 12 months' : 'widgets.prev year'}
                namespace={NAMESPACES.enum.dashboard}
              />
              : {diff}
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
                colors: ['var(--color-chart-4)'],
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
          width={isDesktop ? seriesData.length * 23 : seriesData.length * 15}
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
    </DashboardGridItem>
  );
};

export default PublishedBooksChart;
