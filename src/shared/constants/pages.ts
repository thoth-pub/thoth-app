import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import Filter1Icon from '@mui/icons-material/Filter1';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import LibraryBooksRoundedIcon from '@mui/icons-material/LibraryBooksRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import PermIdentityRoundedIcon from '@mui/icons-material/PermIdentityRounded';

import { ROUTES } from './routes';

export const PAGES = [
  {
    name: 'dashboard',
    href: ROUTES.DASHBOARD,
    icon: HomeRoundedIcon,
  },
  {
    name: 'books',
    href: ROUTES.WORKS,
    icon: MenuBookRoundedIcon,
  },
  {
    name: 'series',
    href: ROUTES.SERIES,
    icon: LibraryBooksRoundedIcon,
  },
  {
    name: 'sets',
    href: ROUTES.BOOKS_SETS,
    icon: Filter1Icon,
  },
  {
    name: 'publisher',
    href: ROUTES.PUBLISHER,
    icon: PermIdentityRoundedIcon,
  },
];

// APP-ADM-01 (ADR-0010): the destinations of the global Admin shell.
//
// These are reached only through the `/admin` namespace, which the Admin access
// gate protects, so they are no longer mixed into the publisher workspace's own
// navigation. This slice deliberately ships only the Admin home and the existing
// publisher directory: no activity, attention or reports entry is added, because
// no authoritative operational read model exists yet.
export const ADMIN_PAGES = [
  {
    name: 'adminHome',
    href: ROUTES.ADMIN,
    icon: HomeRoundedIcon,
  },
  {
    name: 'publishers',
    href: ROUTES.PUBLISHERS,
    icon: BusinessRoundedIcon,
  },
];
