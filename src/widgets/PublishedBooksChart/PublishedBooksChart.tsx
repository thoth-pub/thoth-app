'use client';

import ArrowDropUpRoundedIcon from '@mui/icons-material/ArrowDropUpRounded';
import { BarChart } from '@mui/x-charts';

import { ChartWrapper } from '@/src/entities/book';
import { getMonthName, getStartOfTheCurrentMonthDate, substractMonthesFromDate } from '@/src/shared';
import { useIsDesktop } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { DashboardContentWrapper, TranslatedContent, Typography } from '@/src/shared/ui';

import { useBooksCountByMonth } from './useBooksCountByMonth';

const PublishedBooksChart = () => {
  const isDesktop = useIsDesktop(1280);

  const firstMonthDate = getStartOfTheCurrentMonthDate();
  const secondMonthDate = substractMonthesFromDate(firstMonthDate, 1);
  const thirdMonthDate = substractMonthesFromDate(secondMonthDate, 1);
  const fourthMonthDate = substractMonthesFromDate(thirdMonthDate, 1);
  const fifthMonthDate = substractMonthesFromDate(fourthMonthDate, 1);
  const sixthMonthDate = substractMonthesFromDate(fifthMonthDate, 1);
  const seventhMonthDate = substractMonthesFromDate(sixthMonthDate, 1);
  const eighthMonthDate = substractMonthesFromDate(seventhMonthDate, 1);
  const ninthMonthDate = substractMonthesFromDate(eighthMonthDate, 1);
  const tenthMonthDate = substractMonthesFromDate(ninthMonthDate, 1);
  const eleventhMonthDate = substractMonthesFromDate(tenthMonthDate, 1);
  const twelfthMonthDate = substractMonthesFromDate(eleventhMonthDate, 1);
  const prevYearBooksDate = substractMonthesFromDate(firstMonthDate, 24);

  const { bookCount: firstMonthBooksCount } = useBooksCountByMonth(firstMonthDate);
  const { bookCount: secondMonthBooksCount } = useBooksCountByMonth(secondMonthDate);
  const { bookCount: thirdMonthBooksCount } = useBooksCountByMonth(thirdMonthDate);
  const { bookCount: fourthMonthBooksCount } = useBooksCountByMonth(fourthMonthDate);
  const { bookCount: fifthMonthBooksCount } = useBooksCountByMonth(fifthMonthDate);
  const { bookCount: sixthMonthBooksCount } = useBooksCountByMonth(sixthMonthDate);
  const { bookCount: seventhMonthBooksCount } = useBooksCountByMonth(seventhMonthDate);
  const { bookCount: eighthMonthBooksCount } = useBooksCountByMonth(eighthMonthDate);
  const { bookCount: ninthMonthBooksCount } = useBooksCountByMonth(ninthMonthDate);
  const { bookCount: tenthMonthBooksCount } = useBooksCountByMonth(tenthMonthDate);
  const { bookCount: eleventhMonthBooksCount } = useBooksCountByMonth(eleventhMonthDate);
  const { bookCount: twelfthMonthBooksCount } = useBooksCountByMonth(twelfthMonthDate);
  const { bookCount: prevYearBooksCount } = useBooksCountByMonth(prevYearBooksDate);

  const substractedSecondMonthBooksCount = secondMonthBooksCount - firstMonthBooksCount;
  const substractedThirdMonthBooksCount = thirdMonthBooksCount - secondMonthBooksCount;
  const substractedFourthMonthBooksCount = fourthMonthBooksCount - thirdMonthBooksCount;
  const substractedFifthMonthBooksCount = fifthMonthBooksCount - fourthMonthBooksCount;
  const substractedSixthMonthBooksCount = sixthMonthBooksCount - fifthMonthBooksCount;
  const substractedSeventhMonthBooksCount = seventhMonthBooksCount - sixthMonthBooksCount;
  const substractedEighthMonthBooksCount = eighthMonthBooksCount - seventhMonthBooksCount;
  const substractedNinthMonthBooksCount = ninthMonthBooksCount - eighthMonthBooksCount;
  const substractedTenthMonthBooksCount = tenthMonthBooksCount - ninthMonthBooksCount;
  const substractedEleventhMonthBooksCount = eleventhMonthBooksCount - tenthMonthBooksCount;
  const substractedTwelfthMonthBooksCount = twelfthMonthBooksCount - eleventhMonthBooksCount;

  const currentYearBooksCount = twelfthMonthBooksCount;

  const diff = prevYearBooksCount - currentYearBooksCount;

  const chartData: Record<string, { value: number; month: string }> = {
    [twelfthMonthDate]: { value: substractedTwelfthMonthBooksCount, month: getMonthName(twelfthMonthDate) },
    [eleventhMonthDate]: { value: substractedEleventhMonthBooksCount, month: getMonthName(eleventhMonthDate) },
    [tenthMonthDate]: { value: substractedTenthMonthBooksCount, month: getMonthName(tenthMonthDate) },
    [ninthMonthDate]: { value: substractedNinthMonthBooksCount, month: getMonthName(ninthMonthDate) },
    [eighthMonthDate]: { value: substractedEighthMonthBooksCount, month: getMonthName(eighthMonthDate) },
    [seventhMonthDate]: { value: substractedSeventhMonthBooksCount, month: getMonthName(seventhMonthDate) },
    [sixthMonthDate]: { value: substractedSixthMonthBooksCount, month: getMonthName(sixthMonthDate) },
    [fifthMonthDate]: { value: substractedFifthMonthBooksCount, month: getMonthName(fifthMonthDate) },
    [fourthMonthDate]: { value: substractedFourthMonthBooksCount, month: getMonthName(fourthMonthDate) },
    [thirdMonthDate]: { value: substractedThirdMonthBooksCount, month: getMonthName(thirdMonthDate) },
    [secondMonthDate]: { value: substractedSecondMonthBooksCount, month: getMonthName(secondMonthDate) },
    [firstMonthDate]: { value: firstMonthBooksCount, month: getMonthName(firstMonthDate) },
  };

  const axisData = Object.values(chartData).map(({ month }) => month);
  const seriesData = Object.values(chartData).map(({ value }) => value);

  const isEmpty = seriesData.every((value) => value === 0);

  if (isEmpty) {
    return null;
  }

  return (
    <DashboardContentWrapper>
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
    </DashboardContentWrapper>
  );
};

export default PublishedBooksChart;
