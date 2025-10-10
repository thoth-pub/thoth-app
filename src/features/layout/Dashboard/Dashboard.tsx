'use client';

import LibraryBooksRoundedIcon from '@mui/icons-material/LibraryBooksRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import Link from 'next/link';

import usePublisherStateMachine from '@/src/entities/publisher/store/hooks/usePublisherStateMachine';
import { useSeriesCount } from '@/src/entities/series';
import { useWorksCount } from '@/src/entities/work';
import { PAGES, ROUTES } from '@/src/shared/constants';
import { Paper, Typography } from '@/src/shared/ui';

const pages = PAGES.filter(({ href }) => href === ROUTES.WORKS || href === ROUTES.SERIES);

const Dashboard = () => {
  const { activePublisher } = usePublisherStateMachine();
  const { workCount } = useWorksCount(activePublisher ? [activePublisher] : []);
  const { seriesCount } = useSeriesCount(activePublisher ? [activePublisher] : []);

  return (
    <ul className="flex w-full flex-wrap gap-5">
      {pages.map(({ name, href }) => (
        <Paper
          key={href}
          elevation={1}
          component="li"
          className="group block h-full max-h-[10rem] w-full max-w-[32rem] overflow-clip rounded-xl border-1 border-transparent bg-[var(--color-background-alt)] hover:border-[var(--color-nav-border)] hover:bg-[var(--color-white)]"
        >
          <Link href={href} className="flex grow justify-between p-4 duration-300">
            <div className="flex flex-col gap-1">
              <Typography component="span" variant="h1" color="primary">
                {href === ROUTES.WORKS ? workCount : seriesCount} {name}
              </Typography>

              <Typography
                component="span"
                color="primary"
                className="mt-auto capitalize opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              >
                see all
              </Typography>
            </div>
            {href === ROUTES.WORKS ? (
              <MenuBookRoundedIcon
                color="primary"
                className="h-[127px] w-[127px] opacity-50 transition-opacity duration-300 group-hover:opacity-100"
                height={127}
                width={127}
              />
            ) : (
              <LibraryBooksRoundedIcon
                color="primary"
                className="h-[127px] w-[127px] opacity-50 transition-opacity duration-300 group-hover:opacity-100"
                height={127}
                width={127}
              />
            )}
          </Link>
        </Paper>
      ))}
    </ul>
  );
};

export default Dashboard;
