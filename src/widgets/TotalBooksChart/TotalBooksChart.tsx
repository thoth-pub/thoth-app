'use client';

import { PieChart } from '@mui/x-charts';

import { ChartWrapper, useBooksCount, useForthcomingBooksCount, usePublishedBooksCount } from '@/src/entities/book';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useIsDesktop, useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { CircularProgress, DashboardGridItem, TranslatedContent, Typography } from '@/src/shared/ui';
import { capitalizeFirstLetter } from '@/src/shared/utils';

const TotalBooksChart = () => {
  const { activePublisher } = usePublisherStateMachine();
  const isDesktop = useIsDesktop(1280);
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });

  const publishersIds = activePublisher && activePublisher.id ? [activePublisher.id] : [];

  const { bookCount, isFetched: isBooksCountFetched } = useBooksCount({ publishersIds });
  const { bookCount: publishedBookCount, isFetched: isPublishedBooksCountFetched } =
    usePublishedBooksCount(publishersIds);
  const { bookCount: forthcomingBookCount, isFetched: isForthcomingBooksCountFetched } =
    useForthcomingBooksCount(publishersIds);

  const otherBooksCount = bookCount - publishedBookCount - forthcomingBookCount;

  const chartData: { label: string; value: number; color: string }[] = [];

  const activeLabel = capitalizeFirstLetter(t('active'));
  const forthcomingLabel = capitalizeFirstLetter(t('forthcoming'));
  const otherLabel = capitalizeFirstLetter(t('other'));

  if (publishedBookCount > 0) {
    chartData.push({ label: activeLabel, value: publishedBookCount, color: 'var(--color-success)' });
  }

  if (forthcomingBookCount > 0) {
    chartData.push({ label: forthcomingLabel, value: forthcomingBookCount, color: 'var(--color-warning)' });
  }

  if (otherBooksCount > 0) {
    chartData.push({ label: otherLabel, value: otherBooksCount, color: 'var(--color-error)' });
  }

  const settings = {
    width: isDesktop ? 130 : 95,
    height: isDesktop ? 130 : 95,
    margin: { right: 0 },
    hideLegend: true,
  };

  const isLoading = !isBooksCountFetched || !isPublishedBooksCountFetched || !isForthcomingBooksCountFetched;

  if (isLoading) {
    return (
      <DashboardGridItem>
        <ChartWrapper>
          <CircularProgress className="m-auto h-full" />
        </ChartWrapper>
      </DashboardGridItem>
    );
  }

  if (chartData.length === 0) {
    return (
      <DashboardGridItem>
        <ChartWrapper>
          <div className="flex w-full flex-col gap-1">
            <Typography component="h2" variant="h2" className="mb-2">
              <TranslatedContent content="widgets.catalogue summary" namespace={NAMESPACES.enum.dashboard} />
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
            <TranslatedContent content="widgets.catalogue summary" namespace={NAMESPACES.enum.dashboard} />
          </Typography>
          <ul className="flex list-disc flex-col gap-1 pl-4 xl:pl-8">
            {publishedBookCount > 0 && (
              <Typography component="li" className="list-item capitalize marker:text-(--color-success)">
                {publishedBookCount} <TranslatedContent content="active" />
              </Typography>
            )}
            {forthcomingBookCount > 0 && (
              <Typography component="li" className="list-item capitalize marker:text-(--color-warning)">
                {forthcomingBookCount} <TranslatedContent content="forthcoming" />
              </Typography>
            )}
            {otherBooksCount > 0 && (
              <Typography component="li" className="list-item capitalize marker:text-(--color-error)">
                {otherBooksCount} <TranslatedContent content="other" />
              </Typography>
            )}
          </ul>
        </div>

        <PieChart
          series={[{ innerRadius: isDesktop ? 40 : 30, outerRadius: isDesktop ? 60 : 45, data: chartData }]}
          {...settings}
        />
      </ChartWrapper>
    </DashboardGridItem>
  );
};

export default TotalBooksChart;
