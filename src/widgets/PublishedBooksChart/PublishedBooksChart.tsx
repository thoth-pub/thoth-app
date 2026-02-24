'use client';

import ArrowDropUpRoundedIcon from '@mui/icons-material/ArrowDropUpRounded';
import { BarChart } from '@mui/x-charts';

import { ChartWrapper } from '@/src/entities/book';
import { getMonthName, getStartOfTheCurrentMonthDate, getYear, substractMonthesFromDate } from '@/src/shared';
import { useIsDesktop, useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { CircularProgress, DashboardGridItem, TranslatedContent, Typography } from '@/src/shared/ui';

import { useBooksCountByMonth } from './useBooksCountByMonth';

const PublishedBooksChart = () => {
  const isDesktop = useIsDesktop(1280);
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });

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

  const { bookCount: firstMonthBooksCount, isFetched: isFirstMonthBooksCountFetched } =
    useBooksCountByMonth(firstMonthDate);
  const { bookCount: secondMonthBooksCount, isFetched: isSecondMonthBooksCountFetched } =
    useBooksCountByMonth(secondMonthDate);
  const { bookCount: thirdMonthBooksCount, isFetched: isThirdMonthBooksCountFetched } =
    useBooksCountByMonth(thirdMonthDate);
  const { bookCount: fourthMonthBooksCount, isFetched: isFourthMonthBooksCountFetched } =
    useBooksCountByMonth(fourthMonthDate);
  const { bookCount: fifthMonthBooksCount, isFetched: isFifthMonthBooksCountFetched } =
    useBooksCountByMonth(fifthMonthDate);
  const { bookCount: sixthMonthBooksCount, isFetched: isSixthMonthBooksCountFetched } =
    useBooksCountByMonth(sixthMonthDate);
  const { bookCount: seventhMonthBooksCount, isFetched: isSeventhMonthBooksCountFetched } =
    useBooksCountByMonth(seventhMonthDate);
  const { bookCount: eighthMonthBooksCount, isFetched: isEighthMonthBooksCountFetched } =
    useBooksCountByMonth(eighthMonthDate);
  const { bookCount: ninthMonthBooksCount, isFetched: isNinthMonthBooksCountFetched } =
    useBooksCountByMonth(ninthMonthDate);
  const { bookCount: tenthMonthBooksCount, isFetched: isTenthMonthBooksCountFetched } =
    useBooksCountByMonth(tenthMonthDate);
  const { bookCount: eleventhMonthBooksCount, isFetched: isEleventhMonthBooksCountFetched } =
    useBooksCountByMonth(eleventhMonthDate);
  const { bookCount: twelfthMonthBooksCount, isFetched: isTwelfthMonthBooksCountFetched } =
    useBooksCountByMonth(twelfthMonthDate);
  const { bookCount: prevYearBooksCount, isFetched: isPrevYearBooksCountFetched } =
    useBooksCountByMonth(prevYearBooksDate);

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
    [twelfthMonthDate]: {
      value: substractedTwelfthMonthBooksCount,
      month: `${t(getMonthName(twelfthMonthDate))} ${getYear(twelfthMonthDate)}`,
    },
    [eleventhMonthDate]: { value: substractedEleventhMonthBooksCount, month: t(getMonthName(eleventhMonthDate)) },
    [tenthMonthDate]: { value: substractedTenthMonthBooksCount, month: t(getMonthName(tenthMonthDate)) },
    [ninthMonthDate]: { value: substractedNinthMonthBooksCount, month: t(getMonthName(ninthMonthDate)) },
    [eighthMonthDate]: { value: substractedEighthMonthBooksCount, month: t(getMonthName(eighthMonthDate)) },
    [seventhMonthDate]: { value: substractedSeventhMonthBooksCount, month: t(getMonthName(seventhMonthDate)) },
    [sixthMonthDate]: { value: substractedSixthMonthBooksCount, month: t(getMonthName(sixthMonthDate)) },
    [fifthMonthDate]: { value: substractedFifthMonthBooksCount, month: t(getMonthName(fifthMonthDate)) },
    [fourthMonthDate]: { value: substractedFourthMonthBooksCount, month: t(getMonthName(fourthMonthDate)) },
    [thirdMonthDate]: { value: substractedThirdMonthBooksCount, month: t(getMonthName(thirdMonthDate)) },
    [secondMonthDate]: { value: substractedSecondMonthBooksCount, month: t(getMonthName(secondMonthDate)) },
    [firstMonthDate]: { value: firstMonthBooksCount, month: t(getMonthName(firstMonthDate)) },
  };

  const isLoading =
    !isFirstMonthBooksCountFetched ||
    !isSecondMonthBooksCountFetched ||
    !isThirdMonthBooksCountFetched ||
    !isFourthMonthBooksCountFetched ||
    !isFifthMonthBooksCountFetched ||
    !isSixthMonthBooksCountFetched ||
    !isSeventhMonthBooksCountFetched ||
    !isEighthMonthBooksCountFetched ||
    !isNinthMonthBooksCountFetched ||
    !isTenthMonthBooksCountFetched ||
    !isEleventhMonthBooksCountFetched ||
    !isTwelfthMonthBooksCountFetched ||
    !isPrevYearBooksCountFetched;

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
