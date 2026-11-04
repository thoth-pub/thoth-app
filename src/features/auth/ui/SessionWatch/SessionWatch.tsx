'use client';

import { usePathname, useRouter } from 'next/navigation';
import { SessionContext } from 'next-auth/react';
import { use, useEffect, useEffectEvent, useRef } from 'react';

import { subscribeToUnauthenticated } from '@/src/shared/api/graphqlService';
import { ROUTES } from '@/src/shared/constants';

// APP-AUTH-SESSION-EXPIRY-01 (thoth-app#285).
//
// The proxy only checks the session when a page is requested, so a page that is
// already open is never told that its session has ended. Without this watch an
// expired page keeps running with an empty identity: the `me` query is disabled,
// `useUser` falls back to a user with no publishers, and user-dependent flows
// report results built from that empty data.
//
// The watch reacts to the three ways an open page can learn it is signed out -
// NextAuth reporting no session, NextAuth reporting that the access token could
// not be refreshed, or the Thoth API answering 401 - by sending the user to sign
// in again with the page they were on as the return target. The app never
// handles credentials: ZITADEL's own sign-in session usually makes this a single
// redirect. How often the session is re-checked is configured on the
// `SessionProvider` in `app/providers.tsx`.

/** The `session.error` flag `src/shared/lib/auth/auth.ts` sets when the access token cannot be refreshed. */
export const REFRESH_ACCESS_TOKEN_ERROR = 'RefreshAccessTokenError';

/** The query parameter that carries the return target through the `/` landing (ADR-0010 amendment D2). */
export const RETURN_TO_PARAM = 'returnTo';

/**
 * The publisher workspace routes of the `proxy.ts` matcher, the only places a
 * return target may lead. The matcher must stay a literal for Next.js to analyse
 * it, so it cannot import this list; the test pins the two together.
 */
export const WORKSPACE_ROUTES = ['/dashboard', '/publisher', '/series', '/sets', '/works/:path*'] as const;

/** Every route the proxy gates: the landing, the Admin namespace and the publisher workspace. */
const GATED_ROUTES = [ROUTES.ROOT, `${ROUTES.ADMIN}/:path*`, ...WORKSPACE_ROUTES] as const;

// A conservative path alphabet: unreserved characters and `/` only. Anything
// else - `%` escapes, backslashes, control characters, whitespace, `?`, `#`,
// `:` - is doubtful, and a doubtful target is treated as unsafe.
const SAFE_PATH = /^\/[A-Za-z0-9._~/-]*$/;
const MAX_TARGET_LENGTH = 512;

const matchesRoute = (path: string, route: string) => {
  if (!route.endsWith('/:path*')) return path === route;

  const base = route.slice(0, -'/:path*'.length);
  return path === base || path.startsWith(`${base}/`);
};

const isPlainPath = (value: string) =>
  value.length <= MAX_TARGET_LENGTH &&
  SAFE_PATH.test(value) &&
  !value.includes('//') &&
  !value.split('/').some((segment) => segment === '.' || segment === '..');

/**
 * Whether a return target may be followed after re-authentication: a same-origin
 * relative path that starts with a single `/`, carries nothing that could change
 * its meaning once decoded or normalised, and falls on a publisher workspace
 * route. `/admin` and `/auth` are never workspace routes, so they never qualify.
 */
export const isSafeReturnTarget = (value: unknown): value is string =>
  typeof value === 'string' && isPlainPath(value) && WORKSPACE_ROUTES.some((route) => matchesRoute(value, route));

/** Whether a client-side path is one the proxy requires a session for. */
const isGatedPath = (path: string | null) =>
  path !== null && isPlainPath(path) && GATED_ROUTES.some((route) => matchesRoute(path, route));

/** The sign-in path, carrying the current path as the return target only when it is a safe one. */
export const buildSignInPath = (path: string | null) =>
  isSafeReturnTarget(path) ? `${ROUTES.LOGIN}?callbackUrl=${encodeURIComponent(path)}` : ROUTES.LOGIN;

/**
 * The client's view of the session: `loading` until NextAuth has answered,
 * `expired` once it reports no session or a failed token refresh.
 */
export const useSessionExpiry = () => {
  // The session is read from NextAuth's context rather than through `useSession`, which throws
  // outside a `SessionProvider`: a component rendered without one (as in isolated tests) reads
  // as still loading, never as expired.
  const value = use(SessionContext);
  const session = value?.data;
  const status = value?.status ?? 'loading';

  const expired = status === 'unauthenticated' || session?.error === REFRESH_ACCESS_TOKEN_ERROR;

  return { expired, loading: status === 'loading' };
};

const SessionWatch = () => {
  const { expired } = useSessionExpiry();
  const pathname = usePathname();
  const router = useRouter();

  // One redirect per page: the sign-in page takes over from there.
  const hasRedirected = useRef(false);

  const redirectToSignIn = useEffectEvent(() => {
    if (hasRedirected.current || !isGatedPath(pathname)) return;

    hasRedirected.current = true;
    router.replace(buildSignInPath(pathname));
  });

  // A new page is a new chance to redirect: the guard only collapses the
  // repeated signals one page raises while the redirect is under way.
  useEffect(() => {
    hasRedirected.current = false;
  }, [pathname]);

  useEffect(() => {
    if (expired) redirectToSignIn();
  }, [expired, pathname]);

  useEffect(() => subscribeToUnauthenticated(() => redirectToSignIn()), []);

  return null;
};

export default SessionWatch;
