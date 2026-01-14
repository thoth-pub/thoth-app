import Filter1Icon from '@mui/icons-material/Filter1';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import LibraryBooksRoundedIcon from '@mui/icons-material/LibraryBooksRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import PermIdentityRoundedIcon from '@mui/icons-material/PermIdentityRounded';

import { ROUTES } from './routes';

export const PAGES = [
  {
    name: 'Dashboard',
    href: ROUTES.DASHBOARD,
    icon: HomeRoundedIcon,
  },
  {
    name: 'Books',
    href: ROUTES.WORKS,
    icon: MenuBookRoundedIcon,
  },
  {
    name: 'Series',
    href: ROUTES.SERIES,
    icon: LibraryBooksRoundedIcon,
  },
  {
    name: 'Books sets',
    href: ROUTES.BOOKS_SETS,
    icon: Filter1Icon,
  },
  {
    name: 'Profile',
    href: ROUTES.PROFILE,
    icon: PermIdentityRoundedIcon,
  },
];
