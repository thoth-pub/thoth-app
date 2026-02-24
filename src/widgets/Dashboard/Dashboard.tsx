import AddIcon from '@mui/icons-material/Add';
import NextLink from 'next/link';

import { ROUTES } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { Button, DashboardGrid, TranslatedContent, Typography } from '@/src/shared/ui';
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
            <TranslatedContent content="dashboard" namespace={NAMESPACES.enum.navigation} />
          </Typography>
          <NextLink href={ROUTES.NEW_WORK} passHref>
            <Button startIcon={<AddIcon />} className="capitalize" variant="contained" component="span">
              <TranslatedContent content="actions.new" />
            </Button>
          </NextLink>
        </div>
      </ContentSection>

      <DashboardGrid>
        <TotalBooksChart />
        <PublishedBooksChart />
      </DashboardGrid>

      <RecentlyUpdatedBooks />
      <RecentlyPublishedBooks />
    </>
  );
};

export default Dashboard;
