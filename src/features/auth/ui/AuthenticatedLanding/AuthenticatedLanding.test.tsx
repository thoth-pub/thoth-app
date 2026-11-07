/**
 * APP-ADM-01 (ADR-0010) acceptance 1-4: the authenticated role-resolution
 * landing at `/`.
 *
 * Every successful authentication now returns through `/` so that role
 * resolution happens at one lifecycle boundary. Authoritative superusers enter
 * Admin with no publisher operating context; authoritative ordinary publisher
 * users go to their workspace with their existing selection semantics intact.
 *
 * The load-bearing safety property is the negative one: a pending or failed
 * `me` query must never be routed as though it were an ordinary
 * `isSuperuser: false` user.
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import navigationEn from '@/src/shared/i18n/locales/en/navigation.json';

const useUserMock = vi.fn();
vi.mock('@/src/entities/user', () => ({ useUser: () => useUserMock() }));

const clearStaffContext = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/features/publisher/ui/PublisherOperatingContext/usePublisherOperatingContext', () => ({
  default: () => ({ clearStaffContext }),
}));

const router = { push: vi.fn(), replace: vi.fn() };
const useRouterMock = vi.fn(() => router);
vi.mock('next/navigation', () => ({ useRouter: () => useRouterMock() }));

vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({ t: (key: string) => (navigationEn as Record<string, string>)[key] ?? key }),
}));

import AuthenticatedLanding from './AuthenticatedLanding';

const createUser = (isSuperuser: boolean) => ({
  id: 'user-1',
  email: 'user@example.com',
  firstName: 'Alex',
  lastName: 'Doe',
  isSuperuser,
  linkedPublishers: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  clearStaffContext.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('AuthenticatedLanding', () => {
  it('sends an authoritative superuser to Admin (acceptance 2)', async () => {
    useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true, error: null });

    render(<AuthenticatedLanding />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/admin');
    });
  });

  it('clears any stale staff publisher operating context before entering Admin (acceptance 2, 18)', async () => {
    useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true, error: null });

    render(<AuthenticatedLanding />);

    await waitFor(() => {
      expect(clearStaffContext).toHaveBeenCalled();
    });

    expect(clearStaffContext.mock.invocationCallOrder[0]).toBeLessThan(router.replace.mock.invocationCallOrder[0]);
  });

  it('sends an authoritative ordinary publisher user to the publisher workspace (acceptance 3)', async () => {
    useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true, error: null });

    render(<AuthenticatedLanding />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/dashboard');
    });

    expect(router.replace).not.toHaveBeenCalledWith('/admin');
  });

  describe('non-authoritative identity is never routed as an ordinary publisher (acceptance 4)', () => {
    it('does not route at all while identity is still pending', async () => {
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: false, error: null });

      render(<AuthenticatedLanding />);

      await Promise.resolve();

      expect(router.replace).not.toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('does not route a claimed superuser before identity is authoritative', async () => {
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: false, error: null });

      render(<AuthenticatedLanding />);

      await Promise.resolve();

      expect(router.replace).not.toHaveBeenCalled();
    });

    it('fails closed with a truthful unavailable state when the identity query failed', async () => {
      useUserMock.mockReturnValue({
        user: createUser(false),
        isAuthoritative: false,
        error: new Error('me query failed'),
      });

      render(<AuthenticatedLanding />);

      await Promise.resolve();

      expect(router.replace).not.toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
      expect(screen.getByText(navigationEn.identityUnavailable)).toBeInTheDocument();
    });
  });

  it('resolves the landing only once for a stable authoritative identity', async () => {
    useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true, error: null });

    const { rerender } = render(<AuthenticatedLanding />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledTimes(1);
    });

    rerender(<AuthenticatedLanding />);

    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  /*
    ADR-0010 amendment D2 (thoth-app#285): after re-authentication an ordinary publisher user returns
    to the page they were on, carried as `/?returnTo=`; superusers still enter Admin with no staff
    context; anything doubtful sends the user to the dashboard.
  */
  describe('return target after re-authentication', () => {
    const landOn = (search: string) => window.history.replaceState(null, '', `/${search}`);

    it('returns an ordinary publisher user to the page they were on', async () => {
      landOn('?returnTo=%2Fworks%2F123');
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true, error: null });

      render(<AuthenticatedLanding />);

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith('/works/123');
      });
      expect(router.replace).toHaveBeenCalledTimes(1);
    });

    it('sends a superuser to Admin with staff context cleared, whatever the return target', async () => {
      landOn('?returnTo=%2Fworks%2F123');
      useUserMock.mockReturnValue({ user: createUser(true), isAuthoritative: true, error: null });

      render(<AuthenticatedLanding />);

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith('/admin');
      });
      expect(router.replace).toHaveBeenCalledTimes(1);
      expect(clearStaffContext).toHaveBeenCalled();
      expect(clearStaffContext.mock.invocationCallOrder[0]).toBeLessThan(router.replace.mock.invocationCallOrder[0]);
    });

    it.each([
      ['//evil.example', '%2F%2Fevil.example'],
      ['https://evil.example', 'https%3A%2F%2Fevil.example'],
      ['/admin/x', '%2Fadmin%2Fx'],
      ['/auth/login', '%2Fauth%2Flogin'],
      ['a path outside the matcher', '%2Fnot-a-route'],
      ['an encoded //', '%2F%252F%252Fevil.example'],
      ['a backslash', '%2F%5Cevil.example'],
      ['a control character', '%2Fworks%2F1%0A'],
    ])('sends an ordinary user to the dashboard instead of %s, without echoing it', async (_label, encoded) => {
      landOn(`?returnTo=${encoded}`);
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: true, error: null });

      render(<AuthenticatedLanding />);

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith('/dashboard');
      });
      expect(router.replace).toHaveBeenCalledTimes(1);
    });

    it('does not follow a return target before identity is authoritative', async () => {
      landOn('?returnTo=%2Fworks%2F123');
      useUserMock.mockReturnValue({ user: createUser(false), isAuthoritative: false, error: null });

      render(<AuthenticatedLanding />);

      await Promise.resolve();

      expect(router.replace).not.toHaveBeenCalled();
    });
  });
});
