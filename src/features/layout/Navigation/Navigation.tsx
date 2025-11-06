'use client';

import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import PermIdentityRoundedIcon from '@mui/icons-material/PermIdentityRounded';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { PAGES, ROUTES } from '@/src/shared/constants';
import { IconButton, Paper, Typography } from '@/src/shared/ui';

import { SignOutButton } from '../../auth';
import ContentLanguage from '../../i18n/ContentLanguage';
import { ChangeActivePublisher } from '../../publisher';
import { useIsDesktop } from '@/src/shared/hooks';

type NavigationProps = {
  linkedPublishers?: { publisherId: string; isAdmin: boolean }[];
  isSuperAdmin?: boolean;
};

const Navigation = ({ linkedPublishers = [], isSuperAdmin = false }: NavigationProps) => {
  const isDesktop = useIsDesktop();

  const [isExpanded, setIsExpanded] = useState(isDesktop);

  useEffect(() => {
    setIsExpanded(isDesktop);
  }, [isDesktop]);

  return (
    <Paper
      component="aside"
      elevation={1}
      className="sticky top-2 max-h-[calc(100dvh-2rem)] shrink-0 rounded-[var(--border-nav-radius)] border-1 border-[var(--color-nav-border)] bg-[var(--color-nav-background)] p-3 lg:top-3"
    >
      <motion.div
        initial={false}
        animate={{ width: isExpanded ? '15rem' : '2.5rem' }}
        className="flex h-full max-w-[15rem] flex-col gap-2 overflow-hidden duration-300"
      >
        <div className={`flex items-center justify-between gap-4 ${isExpanded ? 'flex-row' : 'flex-col'}`}>
          <Link className="cursor-pointer" href={ROUTES.DASHBOARD}>
            {isExpanded ? (
              <Image
                src="/logo.png"
                alt="Thoth Open Metadata logo"
                className="block min-h-[97px] min-w-[170px] shrink-0"
                width={170}
                height={97}
                priority
              />
            ) : (
              <Image
                src="/logo_small.png"
                alt="Thoth Open Metadata logo"
                className="block min-h-[42px] min-w-[40px] shrink-0"
                width={40}
                height={42}
                priority
              />
            )}
          </Link>
          <IconButton onClick={() => setIsExpanded(!isExpanded)} className={`${isExpanded && 'self-start'}`}>
            {!isExpanded ? <ArrowForwardIosRoundedIcon /> : <ArrowBackIosNewRoundedIcon />}
          </IconButton>
        </div>

        <ChangeActivePublisher linkedPublishers={linkedPublishers} isSuperAdmin={isSuperAdmin} />
        <ContentLanguage />
        <SignOutButton />
        <nav>
          <ul className="flex flex-col rounded-[var(--border-nav-radius)] border-1 border-[var(--color-nav-border)]">
            {PAGES.map(({ name, href, icon: Icon }) => (
              <li
                key={href}
                className={`py-2 duration-300 hover:bg-[var(--color-hover)] ${isExpanded ? 'px-4' : 'px-1.5'}`}
              >
                <Link href={href} className="flex shrink-0 items-center gap-2">
                  <Icon color="primary" className={`${!isExpanded && 'm-auto'}`} />
                  {isExpanded && (
                    <Typography
                      color="primary"
                      component="span"
                      className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}
                    >
                      {name}
                    </Typography>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div
          className={`mt-auto flex gap-2 rounded-[var(--border-nav-radius)] border-1 border-[var(--color-nav-border)] py-2 ${isExpanded ? 'px-4' : 'h-[2.5rem] w-[2.5rem] px-1.5'}`}
        >
          <PermIdentityRoundedIcon color="primary" className="m-auto shrink-0" />
          {isExpanded && (
            <Typography
              color="primary"
              component="span"
              className={`flex max-w-[85%] flex-col gap-1 font-semibold transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}
            >
              John Doe
              <Typography color="primary" component="span" variant="body2" className="overflow-hidden text-ellipsis">
                john.doelongmail@example.com
              </Typography>
            </Typography>
          )}
        </div>
      </motion.div>
    </Paper>
  );
};

export default Navigation;
