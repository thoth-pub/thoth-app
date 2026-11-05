'use client';

import { useTheme } from '@mui/material/styles';
import { usePathname, useRouter } from 'next/navigation';
import { SessionContext } from 'next-auth/react';
import { use, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { subscribeToUnauthenticated } from '@/src/shared/api/graphqlService';
import { ROUTES } from '@/src/shared/constants';
import { Button, TranslatedContent, Typography } from '@/src/shared/ui';

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

/** NextAuth's own session endpoint, read to confirm a signed-out reading before acting on it. */
const SESSION_ENDPOINT = '/api/auth/session';

/*
  NextAuth turns a session fetch that fails - offline, or a laptop waking before its network -
  into "no session", which reads exactly like signing out. Leaving a page with work in progress
  (a running import included) on that reading would be wrong, so an 'unauthenticated' status is
  only acted on once the session endpoint itself confirms there is no session. A failed request
  confirms nothing: the reading is re-checked on the next online, focus or visibility event, with
  one confirmation in flight at a time and no retry loop. The explicit signals - a failed token
  refresh, a 401 - are not confirmed again: they already say the session has ended.

  The endpoint can also answer with a live session while NextAuth still reads 'unauthenticated':
  once its first fetch has failed, NextAuth 4 does not fetch again on focus or on its interval
  until the page is reloaded. That is a desync, not an expiry - nothing is redirected, the user
  is told to reload, and it clears as soon as NextAuth reads the session again.

  The confirmation is module state so that every reader (the watch, the upload step) agrees. It
  only ever describes an 'unauthenticated' reading: an answer that arrives after the reading has
  changed is dropped, and every authenticated render clears it.
*/
type Confirmation = 'none' | 'signedOut' | 'live';

let confirmation: Confirmation = 'none';
let readingUnauthenticated = false;
let confirmationInFlight: Promise<boolean> | null = null;
const confirmationListeners = new Set<() => void>();

const setConfirmation = (value: Confirmation) => {
  if (confirmation === value) return;

  confirmation = value;
  confirmationListeners.forEach((listener) => listener());
};

const subscribeToConfirmation = (listener: () => void) => {
  confirmationListeners.add(listener);

  return () => {
    confirmationListeners.delete(listener);
  };
};

/** Whether a session endpoint body says there is no usable session: none at all, or a failed refresh. */
const isSignedOutSession = (body: unknown) =>
  body === null ||
  typeof body !== 'object' ||
  !('user' in body) ||
  !body.user ||
  ('error' in body && body.error === REFRESH_ACCESS_TOKEN_ERROR);

/**
 * Asks the session endpoint once whether the session has really ended; a request already in flight
 * is reused. Resolves true when the endpoint answered, false when nothing could be concluded.
 */
const confirmUnauthenticated = (): Promise<boolean> => {
  if (confirmationInFlight) return confirmationInFlight;

  confirmationInFlight = (async () => {
    try {
      const response = await fetch(SESSION_ENDPOINT, { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) return false;

      const result = isSignedOutSession(await response.json()) ? 'signedOut' : 'live';
      // The reading may have changed while the request was out (a sign-in broadcast from another tab).
      if (readingUnauthenticated) setConfirmation(result);
      return true;
    } catch {
      // Offline or unreachable: nothing is known, so nothing is concluded.
      return false;
    } finally {
      confirmationInFlight = null;
    }
  })();

  return confirmationInFlight;
};

/**
 * The client's view of the session: `loading` until NextAuth has answered;
 * `expired` once the token refresh has failed, or once a reported absence of
 * session has been confirmed by the session endpoint; `desynced` while NextAuth
 * reads no session but the endpoint reports a live one.
 */
export const useSessionExpiry = () => {
  // The session is read from NextAuth's context rather than through `useSession`, which throws
  // outside a `SessionProvider`: a component rendered without one (as in isolated tests) reads
  // as still loading, never as expired.
  const value = use(SessionContext);
  const session = value?.data;
  const status = value?.status ?? 'loading';
  const confirmed = useSyncExternalStore(
    subscribeToConfirmation,
    () => confirmation,
    () => 'none' as Confirmation,
  );

  const refreshFailed = session?.error === REFRESH_ACCESS_TOKEN_ERROR;
  const unauthenticated = status === 'unauthenticated';
  const expired = refreshFailed || (unauthenticated && confirmed === 'signedOut');
  const desynced = !refreshFailed && unauthenticated && confirmed === 'live';

  return {
    expired,
    desynced,
    loading: status === 'loading',
    unauthenticated,
    authenticated: status === 'authenticated' && !refreshFailed,
  };
};

/**
 * When an unauthenticated reading cannot be confirmed either way - the endpoint unreachable or
 * answering with an error - it is asked again a bounded number of times, after these delays, and
 * then left to the next online, focus or visibility event.
 */
export const RECONFIRM_DELAYS_MS = [5_000, 15_000, 45_000] as const;

/**
 * The non-blocking notice for a desynced session: the user decides when to reload.
 *
 * It must stay seen and usable while a modal is open (the upload modal included), so it is
 * rendered into `document.body` above the modal layer, and kept out of the `aria-hidden` that an
 * open MUI modal puts on everything beside it.
 */
const SessionDesyncNotice = () => {
  const theme = useTheme();
  const [notice, setNotice] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!notice) return;

    const reveal = () => {
      if (notice.hasAttribute('aria-hidden')) notice.removeAttribute('aria-hidden');
      if (notice.hasAttribute('inert')) notice.removeAttribute('inert');
    };
    reveal();

    const observer = new MutationObserver(reveal);
    observer.observe(notice, { attributes: true, attributeFilter: ['aria-hidden', 'inert'] });

    return () => observer.disconnect();
  }, [notice]);

  return createPortal(
    <div
      ref={setNotice}
      role="status"
      data-testid="session-desync-notice"
      style={{ zIndex: theme.zIndex.snackbar }}
      className="fixed bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded border border-(--color-border) bg-(--color-modal-content-background) px-4 py-3 shadow"
    >
      <Typography>
        <TranslatedContent content="auth.session.interrupted" />
      </Typography>
      <Button variant="outlined" size="small" onClick={() => window.location.reload()}>
        <TranslatedContent content="auth.session.reload" />
      </Button>
    </div>,
    document.body,
  );
};

const SessionWatch = () => {
  const { expired, desynced, unauthenticated, authenticated } = useSessionExpiry();
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

  // Every render records the reading a confirmation describes; a working session clears any
  // earlier confirmation, so a later reading is confirmed afresh.
  useEffect(() => {
    readingUnauthenticated = unauthenticated;
    if (authenticated) setConfirmation('none');
  });

  /** Confirms the current reading; resolves true when there is nothing (more) to confirm. */
  const confirmIfUnauthenticated = useEffectEvent((): Promise<boolean> => {
    if (!unauthenticated || confirmation === 'signedOut') return Promise.resolve(true);

    return confirmUnauthenticated();
  });

  // Confirm a new unauthenticated reading at once, and - only while nothing could be concluded -
  // a bounded number of times more. A changed reading or an unmount cancels what is left.
  useEffect(() => {
    if (!unauthenticated) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const attempt = async (retry: number) => {
      const concluded = await confirmIfUnauthenticated();
      if (cancelled || concluded || retry >= RECONFIRM_DELAYS_MS.length) return;

      timer = setTimeout(() => void attempt(retry + 1), RECONFIRM_DELAYS_MS[retry]);
    };
    void attempt(0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [unauthenticated]);

  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState === 'visible') void confirmIfUnauthenticated();
    };

    window.addEventListener('online', recheck);
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);

    return () => {
      window.removeEventListener('online', recheck);
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, []);

  useEffect(() => {
    if (expired) redirectToSignIn();
  }, [expired, pathname]);

  useEffect(() => subscribeToUnauthenticated(() => redirectToSignIn()), []);

  return desynced && isGatedPath(pathname) ? <SessionDesyncNotice /> : null;
};

export default SessionWatch;
