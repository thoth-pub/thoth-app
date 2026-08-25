import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

const useUserMock = vi.fn();
const useUIContextMock = vi.fn(() => ({ isExpanded: true, updateIsExpanded: vi.fn() }));

vi.mock('@/src/entities/user', () => ({
  useUser: () => useUserMock(),
}));
// Sentinel for APP-SHELL-SU-01: the persistent Add Publisher action was removed
// from the application shell. The real module is stubbed with recognisable
// output so remounting it anywhere in Navigation - through the entity barrel or
// directly - would make the "not in the shell" assertions fail loudly instead of
// silently passing.
vi.mock('@/src/entities/publisher/ui/AddNewPublisher/AddNewPublisher', () => ({
  default: () => <button type="button">actions.addPublisher</button>,
}));
vi.mock('@/src/entities/publisher', () => ({
  AddNewPublisher: () => <button type="button">actions.addPublisher</button>,
}));
// The context switcher keeps its own state seam; the shell only positions it.
vi.mock('../../publisher', () => ({
  ChangeActivePublisher: ({ isHidden }: { isHidden?: boolean }) => (
    <div data-testid="change-active-publisher" data-hidden={String(Boolean(isHidden))} />
  ),
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

const PUBLISHER_CONTEXT_GROUP = 'publisherContext';
const STAFF_GROUP = 'staff';

// The exact publisher-context destinations defined by PAGES, with the exact
// routes they must keep.
const PUBLISHER_CONTEXT_DESTINATIONS = [
  ['dashboard', '/admin/dashboard'],
  ['books', '/admin/works'],
  ['series', '/admin/series'],
  ['sets', '/admin/sets'],
  ['publisher', '/admin/publisher'],
] as const;

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

const collapse = () => {
  useUIContextMock.mockReturnValue({ isExpanded: false, updateIsExpanded: vi.fn() });
};

beforeEach(() => {
  vi.clearAllMocks();
  useUIContextMock.mockReturnValue({ isExpanded: true, updateIsExpanded: vi.fn() });
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

  // APP-SHELL-SU-01: the shell distinguishes publisher-context workflows from
  // staff workflows instead of presenting one mixed list.
  describe('publisher context / staff grouping (APP-SHELL-SU-01)', () => {
    it('gives an authoritative ordinary publisher a publisher-context group and no staff group at all', () => {
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

      renderNavigation();

      expect(screen.getByRole('navigation', { name: PUBLISHER_CONTEXT_GROUP })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: PUBLISHER_CONTEXT_GROUP })).toBeInTheDocument();

      expect(screen.queryByRole('navigation', { name: STAFF_GROUP })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: STAFF_GROUP })).not.toBeInTheDocument();
      expect(screen.queryByText(STAFF_GROUP)).not.toBeInTheDocument();
    });

    it('gives an authoritative superuser two separate, individually named navigation groups', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation();

      const publisherContext = screen.getByRole('navigation', { name: PUBLISHER_CONTEXT_GROUP });
      const staff = screen.getByRole('navigation', { name: STAFF_GROUP });

      // Two distinct landmarks, neither nested inside the other.
      expect(publisherContext).not.toBe(staff);
      expect(publisherContext.contains(staff)).toBe(false);
      expect(staff.contains(publisherContext)).toBe(false);

      // Each is announced by its own visible section heading when expanded.
      expect(screen.getByRole('heading', { name: PUBLISHER_CONTEXT_GROUP })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: STAFF_GROUP })).toBeInTheDocument();
    });

    it('keeps every publisher-context destination, and only those, in the publisher-context group', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation();

      const publisherContext = within(screen.getByRole('navigation', { name: PUBLISHER_CONTEXT_GROUP }));

      for (const [name, href] of PUBLISHER_CONTEXT_DESTINATIONS) {
        expect(publisherContext.getByRole('link', { name })).toHaveAttribute('href', href);
      }

      expect(publisherContext.getAllByRole('link')).toHaveLength(PUBLISHER_CONTEXT_DESTINATIONS.length);
      expect(publisherContext.queryByText('publishers')).not.toBeInTheDocument();
    });

    it('keeps the staff group to exactly the Publishers destination', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation();

      const staff = within(screen.getByRole('navigation', { name: STAFF_GROUP }));
      const links = staff.getAllByRole('link');

      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAccessibleName('publishers');
      expect(links[0]).toHaveAttribute('href', '/admin/publishers');
    });

    it('renders the publisher-context switcher inside the publisher-context group', () => {
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

      renderNavigation();

      const selector = screen.getByTestId('change-active-publisher');
      const group = screen.getByRole('navigation', { name: PUBLISHER_CONTEXT_GROUP }).parentElement;

      expect(group).not.toBeNull();
      expect(group?.contains(selector)).toBe(true);
    });

    it('shows no staff group to a claimed superuser whose identity is not yet authoritative', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: false });

      renderNavigation();

      expect(screen.getByRole('navigation', { name: PUBLISHER_CONTEXT_GROUP })).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: STAFF_GROUP })).not.toBeInTheDocument();
      expect(screen.queryByText(STAFF_GROUP)).not.toBeInTheDocument();
    });
  });

  // APP-SHELL-SU-01: Add Publisher moved out of the shell to the staff
  // Publishers page header.
  describe('Add Publisher is no longer an application-shell action', () => {
    it.each([
      ['an authoritative superuser', true, true],
      ['an authoritative ordinary publisher', false, true],
      ['a not-yet-authoritative claimed superuser', true, false],
    ])('does not mount Add Publisher for %s', (_case, isSuperuser, isAuthoritative) => {
      useUserMock.mockReturnValue({ user: createUser(isSuperuser), isAuthoritative });

      renderNavigation();

      expect(screen.queryByText('actions.addPublisher')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'actions.addPublisher' })).not.toBeInTheDocument();
    });
  });

  // APP-SHELL-SU-01: the compact shell is unchanged apart from carrying the two
  // groups; no section label may leak into it.
  describe('collapsed navigation', () => {
    it('renders no section label text and no section headings', () => {
      collapse();
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation();

      expect(screen.queryByText(PUBLISHER_CONTEXT_GROUP)).not.toBeInTheDocument();
      expect(screen.queryByText(STAFF_GROUP)).not.toBeInTheDocument();
      expect(screen.queryAllByRole('heading')).toHaveLength(0);
    });

    it('renders no destination label text, leaving the icon-only entries', () => {
      collapse();
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation();

      for (const [name] of PUBLISHER_CONTEXT_DESTINATIONS) {
        expect(screen.queryByText(name)).not.toBeInTheDocument();
      }
      expect(screen.queryByText('publishers')).not.toBeInTheDocument();
    });

    it('still exposes both named groups and the staff Publishers destination to an authoritative superuser', () => {
      collapse();
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation();

      expect(screen.getByRole('navigation', { name: PUBLISHER_CONTEXT_GROUP })).toBeInTheDocument();

      const staff = within(screen.getByRole('navigation', { name: STAFF_GROUP }));
      const links = staff.getAllByRole('link');

      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute('href', '/admin/publishers');
    });

    it('still withholds the staff group from an authoritative ordinary publisher', () => {
      collapse();
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

      renderNavigation();

      expect(screen.queryByRole('navigation', { name: STAFF_GROUP })).not.toBeInTheDocument();
    });

    it('keeps the publisher-context switcher mounted and asks it to hide itself', () => {
      collapse();
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

      renderNavigation();

      expect(screen.getByTestId('change-active-publisher')).toHaveAttribute('data-hidden', 'true');
    });
  });
});
