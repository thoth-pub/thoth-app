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

// Staff-only navigation entries (APP-02A). Rendered only after authoritative
// user state confirms the viewer is a superuser; visibility is a presentation
// affordance only - the backend remains the authorization boundary.
export const SUPERUSER_PAGES = [
  {
    name: 'publishers',
    href: ROUTES.PUBLISHERS,
    icon: BusinessRoundedIcon,
  },
];
