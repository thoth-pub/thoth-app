'use client';

import AddIcon from '@mui/icons-material/Add';
import NextLink from 'next/link';

import { ROUTES } from '@/src/shared/constants';
import { Button, Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';
import { PublishedBooksChart, TotalBooksChart } from '@/src/widgets';

import RecentlyPublishedBooks from '../RecentlyPublishedBooks/RecentlyPublishedBooks';
import RecentlyUpdatedBooks from '../RecentlyUpdatedBooks/RecentlyUpdatedBooks';

const Dashboard = () => {
  return (
    <>
      <ContentSection>
        <div className="flex justify-between">
          <Typography component="h1" variant="h1">
            Dashboard
          </Typography>
          <NextLink href={ROUTES.NEW_WORK} passHref>
            <Button startIcon={<AddIcon />} variant="contained" component="a">
              New
            </Button>
          </NextLink>
        </div>
      </ContentSection>

      <div className="flex w-full gap-[15px]">
        <TotalBooksChart />
        <PublishedBooksChart />
      </div>

      <RecentlyUpdatedBooks />
      <RecentlyPublishedBooks />
    </>
  );
};

export default Dashboard;
