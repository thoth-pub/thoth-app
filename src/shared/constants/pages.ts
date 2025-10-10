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
    name: 'Works',
    href: ROUTES.WORKS,
    icon: MenuBookRoundedIcon,
  },
  {
    name: 'Series',
    href: ROUTES.SERIES,
    icon: LibraryBooksRoundedIcon,
  },
  {
    name: 'Profile',
    href: ROUTES.PROFILE,
    icon: PermIdentityRoundedIcon,
  },
];
