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
