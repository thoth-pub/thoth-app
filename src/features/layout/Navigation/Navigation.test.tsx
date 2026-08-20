import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

const useUserMock = vi.fn();
const useUIContextMock = vi.fn(() => ({ isExpanded: true, updateIsExpanded: vi.fn() }));

vi.mock('@/src/entities/user', () => ({
  useUser: () => useUserMock(),
}));
vi.mock('@/src/entities/publisher', () => ({
  AddNewPublisher: () => null,
}));
vi.mock('../../publisher', () => ({
  ChangeActivePublisher: () => null,
}));
vi.mock('../../auth', () => ({
  SignOutButton: () => null,
}));
vi.mock('../../i18n/ContentLanguage', () => ({
  default: () => null,
}));
vi.mock('@/src/shared/store', () => ({
  useUIContext: () => useUIContextMock(),
}));
// Render translation keys verbatim so navigation entries can be asserted by key.
vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({ t: (key: string) => key }),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...(props as object)} />,
}));

import Navigation from './Navigation';

const createUser = (isSuperuser: boolean) => ({
  id: 'user-1',
  email: 'user@example.com',
  firstName: 'Alex',
  lastName: 'Doe',
  isSuperuser,
  linkedPublishers: [],
});

const renderNavigation = () =>
  render(
    <ThemeProvider theme={theme}>
      <Navigation />
    </ThemeProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('Navigation', () => {
  it('does not show the Publishers entry to an authoritative ordinary publisher user', () => {
    useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

    renderNavigation();

    expect(screen.queryByText('publishers')).not.toBeInTheDocument();
  });

  it('shows the Publishers entry pointing at /admin/publishers to an authoritative superuser', () => {
    useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

    renderNavigation();

    const entry = screen.getByText('publishers');

    expect(entry.closest('a')).toHaveAttribute('href', '/admin/publishers');
  });

  it('does not show the Publishers entry while user state is not yet authoritative, even if it claims superuser', () => {
    useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: false });

    renderNavigation();

    expect(screen.queryByText('publishers')).not.toBeInTheDocument();
  });

  it('keeps the existing navigation entries for ordinary publisher users unchanged', () => {
    useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

    renderNavigation();

    for (const entry of ['dashboard', 'books', 'series', 'sets', 'publisher']) {
      expect(screen.getByText(entry)).toBeInTheDocument();
    }
  });

  it('keeps the existing publisher-context profile entry alongside the staff entry for superusers', () => {
    useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

    renderNavigation();

    expect(screen.getByText('publisher').closest('a')).toHaveAttribute('href', '/admin/publisher');
    expect(screen.getByText('publishers').closest('a')).toHaveAttribute('href', '/admin/publishers');
  });
});
