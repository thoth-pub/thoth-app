'use client';

import AddIcon from '@mui/icons-material/Add';
import NextLink from 'next/link';

import { PublishedBooksChart, TotalBooksChart } from '@/src/entities/book';
import { PAGES, ROUTES } from '@/src/shared/constants';
import { Button, Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

const pages = PAGES.filter(({ href }) => href === ROUTES.WORKS || href === ROUTES.SERIES);

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

      <div className="flex w-full gap-4">
        <TotalBooksChart />
        <PublishedBooksChart />
      </div>

      <Typography component="h2" variant="h1" color="primary">
        Recently updated
      </Typography>
      <Typography component="h2" variant="h1" color="primary">
        Recently published
      </Typography>
    </>
  );
};

export default Dashboard;
