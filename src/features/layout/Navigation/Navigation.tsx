'use client';

import type { SvgIconComponent } from '@mui/icons-material';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { Activity, type ReactNode, useState } from 'react';

import { useUser } from '@/src/entities/user';
import { ADMIN_PAGES, PAGES, ROUTES } from '@/src/shared/constants';
import useTypedTranslation from '@/src/shared/hooks/useTypedTranslation';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { useUIContext } from '@/src/shared/store';
import { IconButton, Paper, TranslatedContent, Typography } from '@/src/shared/ui';

import { SignOutButton } from '../../auth';
import ContentLanguage from '../../i18n/ContentLanguage';
import { ChangeActivePublisher } from '../../publisher';
import PublisherOperatingContext from '../../publisher/ui/PublisherOperatingContext/PublisherOperatingContext';

type NavigationGroupProps = {
  label: string;
  hasVisibleHeading?: boolean;
  pages: { name: string; href: string; icon: SvgIconComponent }[];
  isExpanded: boolean;
  children?: ReactNode;
};

// APP-SHELL-SU-01: one labelled application-shell navigation group.
//
// The group's accessible name is carried by the navigation landmark itself, so
// the grouping survives in every state without depending on visual styling.
// Collapsed, no heading is rendered at all, so the compact shell shows no
// clipped or empty label block.
//
// APP-SHELL-SU-02 makes the *visible* heading independent of that accessible
// name. A group can therefore stay a distinct, named landmark while showing no
// section heading at all - which is what the publisher-context group now does,
// after CTO review found its heading redundant above the publisher switcher it
// already sits under. Groups that do want a heading keep one by default.
//
// The destinations, their routes, ordering and semantics are exactly the
// collections passed in - this component groups presentation only and decides
// nothing about which pages exist or who may reach them.
const NavigationGroup = ({ label, hasVisibleHeading = true, pages, isExpanded, children }: NavigationGroupProps) => (
  <div className="flex flex-col gap-3">
    {isExpanded && hasVisibleHeading && (
      <Typography color="primary" component="h2" variant="body2" className="px-1 font-semibold tracking-wide uppercase">
        {label}
      </Typography>
    )}

    {children}

    <nav aria-label={label}>
      <ul className="flex flex-col rounded-(--border-nav-radius) border border-(--color-nav-border)">
        {pages.map(({ name, href, icon: Icon }) => (
          <li key={href} className={`py-2 duration-300 hover:bg-(--color-hover) ${isExpanded ? 'px-4' : 'px-1.5'}`}>
            <Link href={href} className="flex shrink-0 items-center gap-2">
              <Icon color="primary" className={`${!isExpanded && 'm-auto'}`} />
              {isExpanded && (
                <Typography
                  color="primary"
                  component="span"
                  className="capitalize opacity-100 transition-opacity duration-300"
                >
                  <TranslatedContent content={name} namespace={NAMESPACES.enum.navigation} />
                </Typography>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  </div>
);

type NavigationProps = {
  mode?: 'publisher' | 'admin';
};

// APP-ADM-01 (ADR-0010): one shell component, two explicit application modes.
//
// ADR-0010 separates the global Admin console from the ordinary publisher
// workspace. Rather than duplicate the shell, `mode` selects which application
// the user is in: Admin shows only Admin destinations and never an
// active-publisher control; the publisher workspace shows only publisher
// destinations and never an Admin one. There is no combined navigation, and the
// publisher application is not duplicated under `/admin/publishers/:id/...`.
const Navigation = ({ mode = 'publisher' }: NavigationProps) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { user, isAuthoritative } = useUser();
  const { isExpanded, updateIsExpanded } = useUIContext();
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.navigation });

  const handleUserMenuOpen = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  const isAdminMode = mode === 'admin';

  // Which publisher treatment the workspace shows. An authoritative superuser
  // operates a deliberately-entered publisher context and therefore gets the
  // persistent indicator and Return to Admin action; everyone else - including a
  // claimed superuser whose identity is not yet authoritative - keeps the
  // existing active-publisher selector and its unchanged semantics.
  //
  // Presentation only: the backend remains the authorization boundary, and the
  // selector's own hook independently refuses to initialise an ordinary
  // publisher selection for an authoritative superuser.
  const isStaffOperator = isAuthoritative && user.isSuperuser;

  return (
    <Paper
      component="aside"
      elevation={3}
      className="sticky top-2 max-h-[calc(100dvh-2rem)] shrink-0 rounded-(--border-nav-radius) border border-(--color-nav-border) bg-(--color-nav-background) p-3 lg:top-3"
    >
      <motion.div
        initial={false}
        animate={{ width: isExpanded ? '15rem' : '2.5rem' }}
        className="flex h-full max-w-60 flex-col gap-4 overflow-hidden duration-300"
      >
        <div className={`flex items-center justify-between gap-4 ${isExpanded ? 'flex-row' : 'flex-col'}`}>
          {/* The shell home action stays inside the current application. */}
          <Link className="cursor-pointer" href={isAdminMode ? ROUTES.ADMIN : ROUTES.DASHBOARD}>
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
          <IconButton onClick={updateIsExpanded} className={`${isExpanded && 'self-start'}`}>
            {!isExpanded ? <ArrowForwardIosRoundedIcon /> : <ArrowBackIosNewRoundedIcon />}
          </IconButton>
        </div>

        {isAdminMode ? (
          /* Admin: the global staff console. No publisher destinations and no
             active-publisher control of any kind appear here - entering a
             publisher is an explicit action taken from the publisher directory,
             never a side effect of the shell. */
          <NavigationGroup label={t('admin')} pages={ADMIN_PAGES} isExpanded={isExpanded} />
        ) : (
          /* Publisher workspace: the destinations that operate against the
             current publisher, preceded by whichever publisher treatment fits
             the viewer.

             APP-SHELL-SU-02 drops the visible heading here only. The landmark
             keeps its accessible name, so the group remains distinct to
             assistive technology while the expanded shell reads as the publisher
             treatment and the destinations that follow from it. */
          <NavigationGroup
            label={t('publisherContext')}
            hasVisibleHeading={false}
            pages={PAGES}
            isExpanded={isExpanded}
          >
            {isStaffOperator ? <PublisherOperatingContext /> : <ChangeActivePublisher isHidden={!isExpanded} />}
          </NavigationGroup>
        )}

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
