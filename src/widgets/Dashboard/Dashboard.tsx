import AddIcon from '@mui/icons-material/Add';
import NextLink from 'next/link';
import { Suspense } from 'react';

import { ROUTES } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { Button, DashboardChartSkeleton, TranslatedContent, Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';
import { PublishedBooksChart, TotalBooksChart } from '@/src/widgets';

import RecentlyPublishedBooks from '../RecentlyPublishedBooks/RecentlyPublishedBooks';
import RecentlyUpdatedBooks from '../RecentlyUpdatedBooks/RecentlyUpdatedBooks';

const Dashboard = () => {
  return (
    <>
      <ContentSection>
        <div className="flex justify-between">
          <Typography component="h1" variant="h1" className="-ml-1">
            <TranslatedContent content="dashboard" namespace={NAMESPACES.enum.dashboard} />
          </Typography>
          <NextLink href={ROUTES.NEW_WORK} passHref>
            <Button startIcon={<AddIcon />} className="capitalize" variant="contained" component="span">
              <TranslatedContent content="actions.new" />
            </Button>
          </NextLink>
        </div>
      </ContentSection>

      <div className="flex min-h-30 w-full flex-wrap gap-[15px] xl:min-h-40">
        <Suspense fallback={<DashboardChartSkeleton />}>
          <TotalBooksChart />
        </Suspense>
        <Suspense fallback={<DashboardChartSkeleton />}>
          <PublishedBooksChart />
        </Suspense>
      </div>

      <RecentlyUpdatedBooks />
      <RecentlyPublishedBooks />
    </>
  );
};

export default Dashboard;
