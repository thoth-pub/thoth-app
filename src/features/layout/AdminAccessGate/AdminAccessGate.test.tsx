/**
 * APP-ADM-01 (ADR-0010) acceptance 7-11: the Admin access gate.
 *
 * `/admin` and `/admin/*` are the global superuser Admin namespace. An
 * authoritative non-superuser reaching them must get a truthful access-denied
 * state - not a silent redirect, not a flash of Admin content, and not the
 * execution of any staff-only data hook. The backend remains the actual
 * authorization boundary; this gate is presentation/access UX only.
 *
 * Copy is resolved through the REAL `en/navigation.json` resource rather than a
 * key-echoing stub, so these assertions pin the exact English content the
 * specification requires, not merely the presence of a translation key.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import navigationEn from '@/src/shared/i18n/locales/en/navigation.json';

const useUserMock = vi.fn();
vi.mock('@/src/entities/user', () => ({ useUser: () => useUserMock() }));

// Real English copy, looked up by key.
vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({ t: (key: string) => (navigationEn as Record<string, string>)[key] ?? key }),
}));

// A silent redirect is a specification violation, so navigation is spied on and
// asserted to never happen.
const router = { push: vi.fn(), replace: vi.fn() };
const useRouterMock = vi.fn(() => router);
vi.mock('next/navigation', () => ({ useRouter: () => useRouterMock() }));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import AdminAccessGate from './AdminAccessGate';

// Stands in for a protected staff surface: if the gate ever renders its
// children for an unauthorized or not-yet-known identity, this staff-only hook
// executes and the spy records it.
const staffDataHook = vi.fn();
const ProtectedAdminContent = () => {
  staffDataHook();

  return <div>protected admin content</div>;
};

const createUser = (isSuperuser: boolean) => ({
  id: 'user-1',
  email: 'user@example.com',
  firstName: 'Alex',
  lastName: 'Doe',
  isSuperuser,
  linkedPublishers: [],
});

const renderGate = () =>
  render(
    <AdminAccessGate>
      <ProtectedAdminContent />
    </AdminAccessGate>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('AdminAccessGate', () => {
  it('renders Admin content for an authoritative superuser (acceptance 7)', () => {
    useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true, error: null });

    renderGate();

    expect(screen.getByText('protected admin content')).toBeInTheDocument();
    expect(staffDataHook).toHaveBeenCalled();
  });

  describe('authoritative non-superuser (acceptance 8, 10)', () => {
    beforeEach(() => {
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true, error: null });
    });

    it('shows the exact access-denied copy and a dashboard action', () => {
      renderGate();

      expect(screen.getByText('Access denied')).toBeInTheDocument();
      expect(screen.getByText("You don't have permission to access this page.")).toBeInTheDocument();

      const action = screen.getByRole('link', { name: 'Go to dashboard' });

      expect(action).toHaveAttribute('href', '/dashboard');
    });

    it('does not render Admin content or execute staff-only hooks', () => {
      renderGate();

      expect(screen.queryByText('protected admin content')).not.toBeInTheDocument();
      expect(staffDataHook).not.toHaveBeenCalled();
    });

    it('does not silently redirect', () => {
      renderGate();

      expect(router.push).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('does not disclose roles, staff internals or the SUPERUSER flag', () => {
      const { container } = renderGate();
      const text = container.textContent ?? '';

      for (const leak of ['SUPERUSER', 'superuser', 'staff', 'Staff', 'role', 'Role']) {
        expect(text).not.toContain(leak);
      }
    });
  });

  describe('non-authoritative identity (acceptance 9, and never treated as isSuperuser=false)', () => {
    it('shows neither Admin content nor the access-denied state while identity is pending', () => {
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: false, error: null });

      renderGate();

      expect(screen.queryByText('protected admin content')).not.toBeInTheDocument();
      expect(staffDataHook).not.toHaveBeenCalled();
      expect(screen.queryByText('Access denied')).not.toBeInTheDocument();
    });

    it('does not flash Admin content for a claimed superuser before identity is authoritative', () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: false, error: null });

      renderGate();

      expect(screen.queryByText('protected admin content')).not.toBeInTheDocument();
      expect(staffDataHook).not.toHaveBeenCalled();
    });

    it('fails closed with a truthful unavailable state when the identity query failed', () => {
      useUserMock.mockReturnValue({
        user: createUser(false),
        isAuthoritative: false,
        error: new Error('me query failed'),
      });

      renderGate();

      expect(screen.queryByText('protected admin content')).not.toBeInTheDocument();
      expect(staffDataHook).not.toHaveBeenCalled();
      // A failed identity is not an authoritative denial, so it must not claim one.
      expect(screen.queryByText('Access denied')).not.toBeInTheDocument();
      expect(screen.getByText(navigationEn.identityUnavailable)).toBeInTheDocument();
    });
  });
});
