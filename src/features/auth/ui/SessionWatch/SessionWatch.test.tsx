/**
 * APP-AUTH-SESSION-EXPIRY-01 (thoth-app#285): an open page that loses its
 * session is sent to sign in again, with the page it was on as the return
 * target, and that target only ever travels back through the `/` landing.
 */

import { act, cleanup, render, waitFor } from '@testing-library/react';
import { ClientError } from 'graphql-request';
import { NextRequest } from 'next/server';
import { SessionContext } from 'next-auth/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { router, navigation, session, getServerSession, request, sessionProviderProps, passThrough } = vi.hoisted(
  () => ({
    router: { replace: vi.fn(), push: vi.fn() },
    navigation: { pathname: '/works/123' as string | null },
    session: {
      value: { data: null, status: 'loading' } as {
        data: { accessToken?: string; error?: string } | null;
        status: 'loading' | 'authenticated' | 'unauthenticated';
      },
    },
    getServerSession: vi.fn(),
    request: vi.fn(),
    sessionProviderProps: vi.fn(),
    passThrough: ({ children }: { children?: React.ReactNode }) => children,
  }),
);

vi.mock('next/navigation', () => ({
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  useRouter: () => router,
  // eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
  usePathname: () => navigation.pathname,
}));

vi.mock('next-auth/react', async () => {
  const { createContext } = await import('react');
  return {
    SessionContext: createContext<unknown>(undefined),
    SessionProvider: ({ children, ...props }: { children: React.ReactNode }) => {
      sessionProviderProps(props);
      return children;
    },
  };
});

// Only for rendering `app/providers.tsx` to read the SessionProvider configuration.
vi.mock('react-i18next', () => ({ I18nextProvider: passThrough }));
vi.mock('@/src/shared/i18n', () => ({ i18nConfig: {} }));
vi.mock('@/src/shared/providers', () => ({
  LocalizationProvider: passThrough,
  NotificationProvider: () => null,
  StylesCacheProvider: passThrough,
  ThemeProvider: passThrough,
}));
vi.mock('@/src/shared/providers/QueryProvider', () => ({ QueryProvider: passThrough }));
vi.mock('@/app/store', () => ({ default: passThrough }));

// `proxy.ts` and the auth options are imported for real; only what they would
// reach outside the process is replaced.
vi.mock('next-auth', () => ({ default: vi.fn(), getServerSession: (...args: unknown[]) => getServerSession(...args) }));
vi.mock('openid-client', () => ({}));

vi.mock('graphql-request', async (importOriginal) => {
  const actual = await importOriginal<typeof import('graphql-request')>();
  return { ...actual, default: (...args: unknown[]) => request(...args) };
});

import Providers from '@/app/providers';
import { config as proxyConfig, proxy } from '@/proxy';
import { GraphqlError, GraphqlService } from '@/src/shared/api/graphqlService';
import { authOptions } from '@/src/shared/lib/auth/auth';

import SessionWatch, { buildSignInPath, isSafeReturnTarget, WORKSPACE_ROUTES } from './SessionWatch';

/** The watch as the app mounts it: inside NextAuth's session context, here holding the test's session. */
const Watched = () => (
  <SessionContext value={session.value as never}>
    <SessionWatch />
  </SessionContext>
);

const authenticated = { data: { accessToken: 'token' }, status: 'authenticated' as const };
const unauthenticated = { data: null, status: 'unauthenticated' as const };
const refreshFailed = {
  data: { accessToken: 'dead-token', error: 'RefreshAccessTokenError' },
  status: 'authenticated' as const,
};

const clientError = (status: number) =>
  new ClientError({ status, headers: new Headers(), body: '"Invalid token"' } as never, { query: '{ me { userId } }' });

/** The session endpoint's answer: a JSON body, or a network failure. */
const sessionEndpoint = vi.fn<() => Promise<{ ok: boolean; json: () => Promise<unknown> }>>();
const answers = (body: unknown) => sessionEndpoint.mockResolvedValue({ ok: true, json: async () => body });

beforeEach(() => {
  vi.clearAllMocks();
  navigation.pathname = '/works/123';
  session.value = authenticated;
  vi.stubGlobal('fetch', sessionEndpoint);
  answers({});
  // A working session clears any confirmation an earlier test left behind.
  render(<Watched />);
  cleanup();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SessionWatch', () => {
  it('sends an open page whose session goes unauthenticated to sign in, with the page as the return target', async () => {
    const { rerender } = render(<Watched />);
    expect(router.replace).not.toHaveBeenCalled();

    session.value = unauthenticated;
    rerender(<Watched />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1));
    expect(router.replace).toHaveBeenCalledWith('/auth/login?callbackUrl=%2Fworks%2F123');
  });

  it('treats a failed access-token refresh (RefreshAccessTokenError) as signed out', () => {
    const { rerender } = render(<Watched />);

    session.value = refreshFailed;
    rerender(<Watched />);

    expect(router.replace).toHaveBeenCalledWith('/auth/login?callbackUrl=%2Fworks%2F123');
  });

  it('treats a 401 from the Thoth GraphQL API as signed out, and still reports the failure to the caller', async () => {
    render(<Watched />);
    request.mockRejectedValueOnce(clientError(401));

    await act(async () => {
      await expect(new GraphqlService('token').query({} as never, {})).rejects.toBeInstanceOf(GraphqlError);
    });

    expect(router.replace).toHaveBeenCalledWith('/auth/login?callbackUrl=%2Fworks%2F123');
  });

  it('does not treat other API failures as signed out', async () => {
    render(<Watched />);
    request.mockRejectedValueOnce(clientError(500));
    request.mockRejectedValueOnce(
      new ClientError(
        {
          status: 200,
          headers: new Headers(),
          errors: [{ message: 'Unauthorized', extensions: { type: 'NO_ACCESS' } }],
        } as never,
        { query: '{ me { userId } }' },
      ),
    );

    await act(async () => {
      await expect(new GraphqlService('token').query({} as never, {})).rejects.toBeInstanceOf(GraphqlError);
      await expect(new GraphqlService('token').mutation({} as never, {})).rejects.toBeInstanceOf(GraphqlError);
    });

    expect(router.replace).not.toHaveBeenCalled();
  });

  it('stops listening for API 401s once unmounted', async () => {
    const { unmount } = render(<Watched />);
    unmount();
    request.mockRejectedValueOnce(clientError(401));

    await expect(new GraphqlService('token').query({} as never, {})).rejects.toBeInstanceOf(GraphqlError);

    expect(router.replace).not.toHaveBeenCalled();
  });

  it('reads a page rendered outside a SessionProvider as loading, never as signed out', () => {
    render(<SessionWatch />);

    expect(router.replace).not.toHaveBeenCalled();
  });

  it('is mounted under a SessionProvider that re-checks on a bounded interval and on focus, but not while offline', () => {
    render(<Providers>page</Providers>);

    expect(sessionProviderProps).toHaveBeenCalledWith(
      expect.objectContaining({ refetchInterval: 300, refetchOnWindowFocus: true, refetchWhenOffline: false }),
    );
  });

  it('waits while the session is still loading', () => {
    session.value = { data: null, status: 'loading' };
    render(<Watched />);

    expect(router.replace).not.toHaveBeenCalled();
  });

  it('redirects once, however many signals the page raises before it leaves', async () => {
    session.value = unauthenticated;
    render(<Watched />);
    request.mockRejectedValue(clientError(401));

    await act(async () => {
      await expect(new GraphqlService('token').query({} as never, {})).rejects.toThrow();
      await expect(new GraphqlService('token').query({} as never, {})).rejects.toThrow();
    });

    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('never redirects away from the sign-in pages themselves', () => {
    navigation.pathname = '/auth/login';
    session.value = unauthenticated;
    render(<Watched />);

    expect(router.replace).not.toHaveBeenCalled();
  });

  it('signs out of the landing or Admin without proposing a return target', async () => {
    navigation.pathname = '/admin/publishers';
    session.value = unauthenticated;
    render(<Watched />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/auth/login'));
  });

  describe('confirming an unauthenticated reading with the session endpoint', () => {
    const settle = () => act(async () => {});

    it('asks the same-origin session endpoint once, uncached, carrying nothing in the URL', async () => {
      session.value = unauthenticated;
      render(<Watched />);

      await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1));
      expect(sessionEndpoint).toHaveBeenCalledTimes(1);
      expect(sessionEndpoint).toHaveBeenCalledWith('/api/auth/session', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
    });

    it('does not redirect when the confirmation fails for want of a network, and re-checks once back online', async () => {
      sessionEndpoint.mockRejectedValue(new TypeError('Failed to fetch'));
      session.value = unauthenticated;
      render(<Watched />);
      await settle();

      expect(sessionEndpoint).toHaveBeenCalledTimes(1);
      expect(router.replace).not.toHaveBeenCalled();

      answers({});
      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/auth/login?callbackUrl=%2Fworks%2F123'));
      expect(sessionEndpoint).toHaveBeenCalledTimes(2);
    });

    it('does not redirect when the endpoint answers with an error status', async () => {
      sessionEndpoint.mockResolvedValue({ ok: false, json: async () => ({}) });
      session.value = unauthenticated;
      render(<Watched />);
      await settle();

      expect(router.replace).not.toHaveBeenCalled();
    });

    it('does not redirect when the endpoint still has a session', async () => {
      answers({ user: { name: 'Alex' }, expires: '2026-12-01T00:00:00.000Z' });
      session.value = unauthenticated;
      render(<Watched />);
      await settle();

      expect(router.replace).not.toHaveBeenCalled();
    });

    it('redirects when the endpoint reports an empty session', async () => {
      answers({});
      session.value = unauthenticated;
      render(<Watched />);

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/auth/login?callbackUrl=%2Fworks%2F123'));
    });

    it('redirects when the endpoint reports a failed token refresh', async () => {
      answers({ user: { name: 'Alex' }, error: 'RefreshAccessTokenError' });
      session.value = unauthenticated;
      render(<Watched />);

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/auth/login?callbackUrl=%2Fworks%2F123'));
    });

    it('keeps at most one confirmation in flight however many events arrive', async () => {
      let answer: (value: { ok: boolean; json: () => Promise<unknown> }) => void = () => {};
      sessionEndpoint.mockReturnValue(
        new Promise((resolve) => {
          answer = resolve;
        }),
      );
      session.value = unauthenticated;
      render(<Watched />);

      await act(async () => {
        window.dispatchEvent(new Event('online'));
        window.dispatchEvent(new Event('focus'));
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('online'));
      });

      expect(sessionEndpoint).toHaveBeenCalledTimes(1);

      await act(async () => {
        answer({ ok: true, json: async () => ({}) });
      });
      await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1));
    });

    it('does not confirm the explicit signals, which redirect at once', async () => {
      const { rerender } = render(<Watched />);

      session.value = refreshFailed;
      rerender(<Watched />);

      expect(router.replace).toHaveBeenCalledTimes(1);
      expect(sessionEndpoint).not.toHaveBeenCalled();
    });

    it('does not ask the endpoint while the session is authenticated', async () => {
      render(<Watched />);
      await act(async () => {
        window.dispatchEvent(new Event('focus'));
        window.dispatchEvent(new Event('online'));
      });

      expect(sessionEndpoint).not.toHaveBeenCalled();
    });
  });
});

describe('isSafeReturnTarget', () => {
  it.each(['/dashboard', '/publisher', '/series', '/sets', '/works', '/works/123', '/works/new/create', '/works/123/'])(
    'accepts the publisher workspace path %s',
    (target) => {
      expect(isSafeReturnTarget(target)).toBe(true);
    },
  );

  it.each([
    ['another origin, scheme-relative', '//evil.example'],
    ['an absolute URL', 'https://evil.example'],
    ['an absolute URL on a workspace-looking path', 'https://evil.example/works/1'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['the Admin namespace', '/admin/x'],
    ['Admin itself', '/admin'],
    ['the sign-in page', '/auth/login'],
    ['a path outside the proxy matcher', '/not-a-route'],
    ['the landing itself', '/'],
    ['encoded slashes', '/%2F%2Fevil.example'],
    ['an encoded slash inside a workspace path', '/works/%2F%2Fevil.example'],
    ['a backslash', '/\\evil.example'],
    ['a backslash inside a workspace path', '/works/\\evil.example'],
    ['a doubled slash inside a workspace path', '/works//evil.example'],
    ['a dot-dot segment', '/works/../admin'],
    ['a control character', '/works/1\n'],
    ['a tab', '/works/\t/evil.example'],
    ['a query string', '/works?x=1'],
    ['a prefix that is not the route', '/dashboardx'],
    ['a trailing slash on an exact route', '/dashboard/'],
    ['a relative path', 'works/1'],
    ['an empty value', ''],
    ['no value', null],
    ['a non-string', 42],
  ])('rejects %s (%j)', (_label, target) => {
    expect(isSafeReturnTarget(target)).toBe(false);
  });

  it('keeps the workspace routes in step with the proxy matcher', () => {
    expect(proxyConfig.matcher).toEqual(['/', '/admin/:path*', ...WORKSPACE_ROUTES]);
  });

  it('only proposes a return target that is safe', () => {
    expect(buildSignInPath('/works/123')).toBe('/auth/login?callbackUrl=%2Fworks%2F123');
    expect(buildSignInPath('/admin/x')).toBe('/auth/login');
    expect(buildSignInPath(null)).toBe('/auth/login');
  });
});

describe('the return target on its way back through `/` (ADR-0010 amendment D2)', () => {
  const baseUrl = 'https://app.thoth.example';
  const redirect = (url: string) => authOptions.callbacks!.redirect!({ url, baseUrl });

  it('restores the requested path as the proxy sign-in return target', async () => {
    getServerSession.mockResolvedValueOnce(null);

    const response = await proxy(new NextRequest(`${baseUrl}/works/123`));

    expect(new URL(response.headers.get('location')!).pathname).toBe('/auth/login');
    expect(new URL(response.headers.get('location')!).searchParams.get('callbackUrl')).toBe('/works/123');
  });

  it('leaves a signed-in request alone', async () => {
    getServerSession.mockResolvedValueOnce({ user: {} });

    const response = await proxy(new NextRequest(`${baseUrl}/works/123`));

    expect(response.headers.get('location')).toBeNull();
  });

  it.each([
    ['/works/123', `${baseUrl}/?returnTo=%2Fworks%2F123`],
    [`${baseUrl}/works/123`, `${baseUrl}/?returnTo=%2Fworks%2F123`],
    // NextAuth runs the callback again on the URL it already produced.
    [`${baseUrl}/?returnTo=%2Fworks%2F123`, `${baseUrl}/?returnTo=%2Fworks%2F123`],
  ])('carries %s through the landing, never straight to it', async (url, expected) => {
    await expect(redirect(url)).resolves.toBe(expected);
  });

  it.each([
    baseUrl,
    `${baseUrl}/`,
    '//evil.example',
    'https://evil.example',
    'https://evil.example/works/123',
    '/\\evil.example',
    '/\t/evil.example',
    `${baseUrl}/%2F%2Fevil.example`,
    `${baseUrl}/?returnTo=%2F%2Fevil.example`,
    `${baseUrl}/?returnTo=https%3A%2F%2Fevil.example`,
    `${baseUrl}/?returnTo=%2F%255C`,
    `${baseUrl}/?returnTo=%2Fworks%2F..%2Fadmin`,
    'javascript:alert(1)',
    // Plain paths that are not publisher workspace routes are not echoed either.
    '/admin/x',
    `${baseUrl}/admin`,
    '/auth/login',
    `${baseUrl}/works/../admin`,
    '/not-a-route',
    '/dashboard/',
    `${baseUrl}/?returnTo=%2Fadmin%2Fx`,
    `${baseUrl}/?returnTo=%2Fauth%2Flogin`,
  ])('lands on `/` with nothing echoed for %j', async (url) => {
    await expect(redirect(url)).resolves.toBe(`${baseUrl}/`);
  });

  it('carries exactly the targets the landing would follow, so the two allowlists cannot drift', async () => {
    const corpus = [
      '/',
      '/admin',
      '/admin/x',
      '/auth',
      '/auth/login',
      '/not-a-route',
      ...WORKSPACE_ROUTES.flatMap((route) => {
        const base = route.replace('/:path*', '');
        return [base, `${base}/`, `${base}/123`, `${base}/123/`, `${base}x`, `${base}/new/create`];
      }),
    ];

    for (const path of corpus) {
      const carried = (await redirect(path)) !== `${baseUrl}/`;
      expect({ path, carried }).toEqual({ path, carried: isSafeReturnTarget(path) });
    }
  });
});
