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
// APP-ADM-01: the superuser's publisher-workspace treatment owns its own
// restoration/Return-to-Admin seam; the shell only decides where it sits and
// who sees it instead of the selector.
vi.mock('../../publisher/ui/PublisherOperatingContext/PublisherOperatingContext', () => ({
  default: () => <div data-testid="publisher-operating-context" />,
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
// APP-SHELL-SU-02: the superuser group is named Admin. `staff` is retained here
// only as a sentinel proving the former label is gone from every surface.
const ADMIN_GROUP = 'admin';
const FORMER_STAFF_GROUP = 'staff';

// APP-ADM-01 (ADR-0010): the publisher workspace no longer sits under `/admin`.
// These are the exact destinations of the publisher shell, with the exact
// root-level routes they must carry.
const PUBLISHER_CONTEXT_DESTINATIONS = [
  ['dashboard', '/dashboard'],
  ['books', '/works'],
  ['series', '/series'],
  ['sets', '/sets'],
  ['publisher', '/publisher'],
] as const;

// The Admin shell's own destinations - and only these in this slice. No
// activity/attention/reports placeholders are introduced by APP-ADM-01.
const ADMIN_DESTINATIONS = [
  ['adminHome', '/admin'],
  ['publishers', '/admin/publishers'],
] as const;

const createUser = (isSuperuser: boolean) => ({
  id: 'user-1',
  email: 'user@example.com',
  firstName: 'Alex',
  lastName: 'Doe',
  isSuperuser,
  linkedPublishers: [],
});

const renderNavigation = (mode: 'publisher' | 'admin' = 'publisher') =>
  render(
    <ThemeProvider theme={theme}>
      <Navigation mode={mode} />
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
  // APP-ADM-01 acceptance 5: the publisher workspace is a root-level namespace,
  // and the Admin namespace is not reachable from inside it except through the
  // explicit Return to Admin action the operating-context treatment owns.
  describe('publisher workspace shell', () => {
    it('keeps every publisher destination, and only those, on their new root-level routes', () => {
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

      renderNavigation('publisher');

      const publisherContext = within(screen.getByRole('navigation', { name: PUBLISHER_CONTEXT_GROUP }));

      for (const [name, href] of PUBLISHER_CONTEXT_DESTINATIONS) {
        expect(publisherContext.getByRole('link', { name })).toHaveAttribute('href', href);
      }

      expect(publisherContext.getAllByRole('link')).toHaveLength(PUBLISHER_CONTEXT_DESTINATIONS.length);
    });

    it('exposes no Admin destinations at all, not even to an authoritative superuser', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation('publisher');

      expect(screen.queryByRole('navigation', { name: ADMIN_GROUP })).not.toBeInTheDocument();
      expect(screen.queryByText('publishers')).not.toBeInTheDocument();
      expect(screen.queryByText('adminHome')).not.toBeInTheDocument();
    });

    it('gives an authoritative ordinary publisher user the existing active-publisher selector', () => {
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

      renderNavigation('publisher');

      expect(screen.getByTestId('change-active-publisher')).toBeInTheDocument();
      expect(screen.queryByTestId('publisher-operating-context')).not.toBeInTheDocument();
    });

    // Acceptance 15: a superuser gets the persistent operating-context treatment
    // instead of a picker - they never drift into a publisher.
    it('gives an authoritative superuser the operating-context treatment instead of the selector', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation('publisher');

      expect(screen.getByTestId('publisher-operating-context')).toBeInTheDocument();
      expect(screen.queryByTestId('change-active-publisher')).not.toBeInTheDocument();
    });

    it('keeps the ordinary selector seam while a claimed superuser identity is not yet authoritative', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: false });

      renderNavigation('publisher');

      expect(screen.getByTestId('change-active-publisher')).toBeInTheDocument();
      expect(screen.queryByTestId('publisher-operating-context')).not.toBeInTheDocument();
    });

    it('points the shell home action at the publisher workspace', () => {
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

      renderNavigation('publisher');

      expect(screen.getByRole('link', { name: /Thoth Open Metadata logo/i })).toHaveAttribute('href', '/dashboard');
    });

    it('renders the publisher-context switcher inside the publisher-context group', () => {
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

      renderNavigation('publisher');

      const selector = screen.getByTestId('change-active-publisher');
      const group = screen.getByRole('navigation', { name: PUBLISHER_CONTEXT_GROUP }).parentElement;

      expect(group).not.toBeNull();
      expect(group?.contains(selector)).toBe(true);
    });

    // APP-SHELL-SU-02 acceptance 1/2, preserved: the grouping survives as a
    // landmark, the visible heading does not.
    it('renders no visible Publisher context heading while keeping the landmark', () => {
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

      renderNavigation('publisher');

      expect(screen.getByRole('navigation', { name: PUBLISHER_CONTEXT_GROUP })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: PUBLISHER_CONTEXT_GROUP })).not.toBeInTheDocument();
      expect(screen.queryByText(PUBLISHER_CONTEXT_GROUP)).not.toBeInTheDocument();
    });
  });

  // APP-ADM-01 acceptance 7: `/admin` is a genuine global Admin namespace with
  // its own shell, not the publisher application wearing a prefix.
  describe('Admin shell', () => {
    it('exposes exactly the Admin destinations', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation('admin');

      const admin = within(screen.getByRole('navigation', { name: ADMIN_GROUP }));

      for (const [name, href] of ADMIN_DESTINATIONS) {
        expect(admin.getByRole('link', { name })).toHaveAttribute('href', href);
      }

      expect(admin.getAllByRole('link')).toHaveLength(ADMIN_DESTINATIONS.length);
    });

    it('exposes no publisher-workspace destinations', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation('admin');

      expect(screen.queryByRole('navigation', { name: PUBLISHER_CONTEXT_GROUP })).not.toBeInTheDocument();

      for (const [name] of PUBLISHER_CONTEXT_DESTINATIONS) {
        expect(screen.queryByText(name)).not.toBeInTheDocument();
      }
    });

    it('exposes no active-publisher selector and no operating-context treatment', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation('admin');

      expect(screen.queryByTestId('change-active-publisher')).not.toBeInTheDocument();
      expect(screen.queryByTestId('publisher-operating-context')).not.toBeInTheDocument();
    });

    it('keeps the shell home action inside Admin', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation('admin');

      expect(screen.getByRole('link', { name: /Thoth Open Metadata logo/i })).toHaveAttribute('href', '/admin');
    });

    // APP-ADM-01 explicitly defers Admin operational surfaces to a later stage.
    it('invents no operational Admin destinations', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation('admin');

      for (const absent of ['activity', 'attention', 'reports']) {
        expect(screen.queryByText(absent)).not.toBeInTheDocument();
      }
    });

    it('names the Admin group Admin, with no trace of Staff', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation('admin');

      expect(screen.getByRole('heading', { name: ADMIN_GROUP })).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: FORMER_STAFF_GROUP })).not.toBeInTheDocument();
      expect(screen.queryByText(FORMER_STAFF_GROUP)).not.toBeInTheDocument();
    });
  });

  // APP-SHELL-SU-01 moved Add Publisher out of the shell to the Publishers
  // surface; APP-SHELL-SU-02 changed where it lives on that surface, not the
  // fact that the shell no longer mounts it.
  describe('Add Publisher is no longer an application-shell action', () => {
    it.each([
      ['an authoritative superuser in Admin', true, true, 'admin'],
      ['an authoritative superuser in the workspace', true, true, 'publisher'],
      ['an authoritative ordinary publisher', false, true, 'publisher'],
      ['a not-yet-authoritative claimed superuser', true, false, 'publisher'],
    ] as const)('does not mount Add Publisher for %s', (_case, isSuperuser, isAuthoritative, mode) => {
      useUserMock.mockReturnValue({ user: createUser(isSuperuser), isAuthoritative });

      renderNavigation(mode);

      expect(screen.queryByText('actions.addPublisher')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'actions.addPublisher' })).not.toBeInTheDocument();
    });
  });

  // The compact shell carries its group without leaking any section label.
  describe('collapsed navigation', () => {
    it('renders no section label text and no section headings', () => {
      collapse();
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation('admin');

      expect(screen.queryByText(ADMIN_GROUP)).not.toBeInTheDocument();
      expect(screen.queryByText(FORMER_STAFF_GROUP)).not.toBeInTheDocument();
      expect(screen.queryAllByRole('heading')).toHaveLength(0);
    });

    it('renders no destination label text, leaving the icon-only entries', () => {
      collapse();
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

      renderNavigation('publisher');

      for (const [name] of PUBLISHER_CONTEXT_DESTINATIONS) {
        expect(screen.queryByText(name)).not.toBeInTheDocument();
      }
    });

    it('still exposes the Admin destinations to an authoritative superuser', () => {
      collapse();
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation('admin');

      const admin = within(screen.getByRole('navigation', { name: ADMIN_GROUP }));

      expect(admin.getAllByRole('link')).toHaveLength(ADMIN_DESTINATIONS.length);
    });

    it('keeps the publisher-context switcher mounted and asks it to hide itself', () => {
      collapse();
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

      renderNavigation('publisher');

      expect(screen.getByTestId('change-active-publisher')).toHaveAttribute('data-hidden', 'true');
    });
  });

  // APP-NAV-SPACING-01: the expanded shell needs a coarser rhythm between its
  // major regions than it does inside a single group. jsdom measures no pixels,
  // so the approved contract is pinned structurally, on the exact containers
  // that carry it. APP-ADM-01 must not disturb that rhythm in either shell.
  describe('navigation spacing rhythm (APP-NAV-SPACING-01)', () => {
    const MAJOR_RHYTHM = 'gap-4';
    const GROUP_RHYTHM = 'gap-3';
    const FORMER_RHYTHM = 'gap-2';

    const getGroupRoot = (label: string) => {
      const root = screen.getByRole('navigation', { name: label }).parentElement;

      expect(root).not.toBeNull();

      return root as HTMLElement;
    };

    const getShellStack = (label: string) => {
      const stack = getGroupRoot(label).parentElement;

      expect(stack).not.toBeNull();

      return stack as HTMLElement;
    };

    it('separates the major shell regions with the approved major rhythm', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation('publisher');

      const shellStack = getShellStack(PUBLISHER_CONTEXT_GROUP);

      expect(shellStack).toHaveClass('flex', 'flex-col', MAJOR_RHYTHM);
      expect(shellStack).not.toHaveClass(FORMER_RHYTHM);
    });

    it('separates the publisher switcher from its destination list with the approved group rhythm', () => {
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

      renderNavigation('publisher');

      const publisherContext = getGroupRoot(PUBLISHER_CONTEXT_GROUP);

      expect(publisherContext).toHaveClass('flex', 'flex-col', GROUP_RHYTHM);
      expect(publisherContext).not.toHaveClass(FORMER_RHYTHM);
    });

    it('separates the Admin heading from its destination list with the approved group rhythm', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation('admin');

      expect(getGroupRoot(ADMIN_GROUP)).toHaveClass('flex', 'flex-col', GROUP_RHYTHM);
      expect(getShellStack(ADMIN_GROUP)).toHaveClass('flex', 'flex-col', MAJOR_RHYTHM);
    });

    it('leaves expanded destination-row padding and icon/text spacing untouched', () => {
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true });

      renderNavigation('publisher');

      const dashboard = within(screen.getByRole('navigation', { name: PUBLISHER_CONTEXT_GROUP })).getByRole('link', {
        name: 'dashboard',
      });

      expect(dashboard).toHaveClass('items-center', FORMER_RHYTHM);
      expect(dashboard.closest('li')).toHaveClass('py-2', 'px-4');
    });

    it('keeps the same major rhythm and untouched row spacing when collapsed', () => {
      collapse();
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true });

      renderNavigation('admin');

      expect(getShellStack(ADMIN_GROUP)).toHaveClass(MAJOR_RHYTHM);
      expect(getGroupRoot(ADMIN_GROUP)).toHaveClass(GROUP_RHYTHM);

      // Collapsed entries are icon-only by design, so they carry no accessible
      // name; the row is identified by the destination it points at instead.
      const publishers = within(screen.getByRole('navigation', { name: ADMIN_GROUP }))
        .getAllByRole('link')
        .find((link) => link.getAttribute('href') === '/admin/publishers');

      expect(publishers).toBeDefined();
      expect(publishers).toHaveClass('items-center', FORMER_RHYTHM);
      expect(publishers?.closest('li')).toHaveClass('py-2', 'px-1.5');
    });
  });
});
