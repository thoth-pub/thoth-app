'use client';

import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { Activity, useState } from 'react';

import { useUser } from '@/src/entities/user';
import { PAGES, ROUTES } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import useUIStateMachine from '@/src/shared/store/ui/hooks/useUIStateMachine';
import { IconButton, Paper, TranslatedContent, Typography } from '@/src/shared/ui';

import { SignOutButton } from '../../auth';
import ContentLanguage from '../../i18n/ContentLanguage';
import { ChangeActivePublisher } from '../../publisher';

const Navigation = () => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(true);

  const { isExpanded, update } = useUIStateMachine();
  const { user } = useUser();

  const handleUserMenuOpen = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  return (
    <Paper
      component="aside"
      elevation={3}
      className="sticky top-2 max-h-[calc(100dvh-2rem)] shrink-0 rounded-(--border-nav-radius) border border-(--color-nav-border) bg-(--color-nav-background) p-3 lg:top-3"
    >
      <motion.div
        initial={false}
        animate={{ width: isExpanded ? '15rem' : '2.5rem' }}
        className="flex h-full max-w-60 flex-col gap-2 overflow-hidden duration-300"
      >
        <div className={`flex items-center justify-between gap-4 ${isExpanded ? 'flex-row' : 'flex-col'}`}>
          <Link className="cursor-pointer" href={ROUTES.DASHBOARD}>
            <Activity mode={isExpanded ? 'visible' : 'hidden'}>
              <Image
                src="/logo.png"
                alt="Thoth Open Metadata logo"
                className="animate-fade-in block min-h-[97px] min-w-[170px] shrink-0"
                width={170}
                height={97}
                priority
                fetchPriority="high"
              />
            </Activity>

            <Activity mode={isExpanded ? 'hidden' : 'visible'}>
              <Image
                src="/logo_small.png"
                alt="Thoth Open Metadata logo"
                className="animate-fade-in block min-h-[42px] min-w-[40px] shrink-0"
                width={40}
                height={42}
                priority
                fetchPriority="high"
              />
            </Activity>
          </Link>
          <IconButton onClick={update} className={`${isExpanded && 'self-start'}`}>
            {!isExpanded ? <ArrowForwardIosRoundedIcon /> : <ArrowBackIosNewRoundedIcon />}
          </IconButton>
        </div>

        <ChangeActivePublisher isHidden={!isExpanded} />
        <nav>
          <ul className="flex flex-col rounded-(--border-nav-radius) border border-(--color-nav-border)">
            {PAGES.map(({ name, href, icon: Icon }) => (
              <li key={href} className={`py-2 duration-300 hover:bg-(--color-hover) ${isExpanded ? 'px-4' : 'px-1.5'}`}>
                <Link href={href} className="flex shrink-0 items-center gap-2">
                  <Icon color="primary" className={`${!isExpanded && 'm-auto'}`} />
                  {isExpanded && (
                    <Typography
                      color="primary"
                      component="span"
                      className={`capitalize transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}
                    >
                      <TranslatedContent content={name} namespace={NAMESPACES.enum.navigation} />
                    </Typography>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {isExpanded && (
          <div
            className={`mt-auto flex gap-2 rounded-(--border-nav-radius) border border-(--color-nav-border) py-2 ${isExpanded ? 'px-4' : 'h-10 w-10 px-1.5'}`}
          >
            <div
              className={`flex max-w-full flex-1 flex-col gap-1 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}
            >
              <div className="flex items-center justify-between gap-1">
                <Typography color="primary" component="span" className="max-w-[85%] truncate font-semibold">
                  {user.firstName} {user.lastName}
                </Typography>
                <IconButton className="shrink-0 p-0" onClick={handleUserMenuOpen}>
                  <ArrowDropDownRoundedIcon className={isUserMenuOpen ? 'rotate-180' : 'rotate-0'} />
                </IconButton>
              </div>

              <Typography color="primary" component="span" variant="body2" className="overflow-hidden text-ellipsis">
                {user.email}
              </Typography>
              {isUserMenuOpen && <ContentLanguage />}
            </div>
          </div>
        )}

        <div className={`flex justify-center ${!isExpanded ? 'mt-auto' : ''}`}>
          <SignOutButton />
        </div>
      </motion.div>
    </Paper>
  );
};

export default Navigation;
