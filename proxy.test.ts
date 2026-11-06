// @vitest-environment node
/**
 * APP-AUTH-REFRESH-HOTFIX-01 (#292): the proxy gates the session with `getToken`
 * (decode only) and never with `getServerSession`, whose `jwt` callback would
 * spend ZITADEL's rotating refresh token in a context that discards the
 * replacement cookie. Expired, failed or token-less sessions are signed out.
 *
 * The real `authOptions` is loaded (with a test SESSION_SECRET) so the secret
 * the proxy hands to `getToken` is the one NextAuth itself uses; its callbacks
 * are spied to prove the proxy never runs them.
 */

import { NextRequest } from 'next/server';
import type { JWT } from 'next-auth/jwt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { TEST_SECRET } = vi.hoisted(() => {
  const TEST_SECRET = 'proxy-test-session-secret';
  process.env.SESSION_SECRET = TEST_SECRET;
  return { TEST_SECRET };
});

const { getToken } = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock('next-auth/jwt', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-auth/jwt')>();
  return { ...actual, getToken };
});

const { getServerSession } = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock('next-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-auth')>();
  return { ...actual, getServerSession };
});
vi.mock('next-auth/next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-auth/next')>();
  return { ...actual, getServerSession };
});

import { config, proxy } from './proxy';
import { authOptions } from './src/shared/lib/auth/auth';

const NOW = Date.parse('2026-11-06T12:00:00.000Z');
const LOGIN_URL = 'https://admin.thoth.pub/auth/login';

const SECURE = '__Secure-next-auth.session-token';
const INSECURE = 'next-auth.session-token';

const ENV_KEYS = ['VERCEL', 'AUTH_TRUST_HOST', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'AUTH_SECRET'] as const;

function request(path = '/works', headers: Record<string, string> = {}) {
  return new NextRequest(`https://admin.thoth.pub${path}`, { headers });
}

function liveToken(overrides: Partial<JWT> = {}): JWT {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    idToken: 'id-token',
    expiresAt: NOW + 3_600_000,
    ...overrides,
  };
}

function expectLoginRedirect(response: Response) {
  expect(response.status).toBe(307);
  expect(response.headers.get('location')).toBe(LOGIN_URL);
}

function expectNext(response: Response) {
  expect(response.headers.get('x-middleware-next')).toBe('1');
  expect(response.headers.get('location')).toBeNull();
}

let jwtSpy: ReturnType<typeof vi.spyOn>;
let sessionSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  for (const key of ENV_KEYS) vi.stubEnv(key, undefined);
  getToken.mockReset();
  getServerSession.mockReset();
  jwtSpy = vi.spyOn(authOptions.callbacks!, 'jwt');
  sessionSpy = vi.spyOn(authOptions.callbacks!, 'session');
});

afterEach(() => {
  expect(getServerSession).not.toHaveBeenCalled();
  expect(jwtSpy).not.toHaveBeenCalled();
  expect(sessionSpy).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('proxy session gating (#292)', () => {
  it('redirects to login when there is no token', async () => {
    getToken.mockResolvedValue(null);

    expectLoginRedirect(await proxy(request()));
  });

  it('redirects to login when the token carries RefreshAccessTokenError', async () => {
    getToken.mockResolvedValue(liveToken({ error: 'RefreshAccessTokenError' }));

    expectLoginRedirect(await proxy(request()));
  });

  it('redirects to login when the token has no accessToken', async () => {
    getToken.mockResolvedValue(liveToken({ accessToken: undefined }));

    expectLoginRedirect(await proxy(request()));
  });

  it('redirects to login when expiresAt is in the past', async () => {
    getToken.mockResolvedValue(liveToken({ expiresAt: NOW - 1 }));

    expectLoginRedirect(await proxy(request()));
  });

  it.each([
    ['exactly now + 60 s (boundary)', NOW + 60_000],
    ['now + 59.999 s', NOW + 59_999],
    ['now + 1 s', NOW + 1_000],
  ])('redirects to login when expiresAt is within 60 s: %s', async (_label, expiresAt) => {
    getToken.mockResolvedValue(liveToken({ expiresAt }));

    expectLoginRedirect(await proxy(request()));
  });

  it.each([
    ['missing', undefined],
    ['a string', '1793000000000'],
    ['NaN', Number.NaN],
  ])('redirects to login when expiresAt is %s', async (_label, expiresAt) => {
    getToken.mockResolvedValue(liveToken({ expiresAt: expiresAt as number | undefined }));

    expectLoginRedirect(await proxy(request()));
  });

  it.each([
    ['now + 60.001 s', NOW + 60_001],
    ['now + 1 h', NOW + 3_600_000],
  ])('lets the request through when expiresAt is more than 60 s ahead: %s', async (_label, expiresAt) => {
    getToken.mockResolvedValue(liveToken({ expiresAt }));

    expectNext(await proxy(request()));
  });

  it('never calls getServerSession or the authOptions jwt/session callbacks', async () => {
    getToken.mockResolvedValue(liveToken({ expiresAt: NOW - 1 }));
    await proxy(request());
    getToken.mockResolvedValue(liveToken());
    await proxy(request());

    expect(getToken).toHaveBeenCalledTimes(2);
    expect(getServerSession).not.toHaveBeenCalled();
    expect(jwtSpy).not.toHaveBeenCalled();
    expect(sessionSpy).not.toHaveBeenCalled();
  });
});

describe('getToken options mirror NextAuth (#292)', () => {
  it('uses the authOptions secret, which is SESSION_SECRET', async () => {
    getToken.mockResolvedValue(null);
    vi.stubEnv('NEXTAUTH_SECRET', 'must-not-win');

    await proxy(request());

    expect(authOptions.secret).toBe(TEST_SECRET);
    expect(getToken).toHaveBeenCalledWith(expect.objectContaining({ secret: TEST_SECRET }));
  });

  it.each([
    ['on Vercel with an https forwarded proto', { VERCEL: '1' }, { 'x-forwarded-proto': 'https' }, true],
    ['on Vercel with no forwarded proto', { VERCEL: '1' }, {}, true],
    ['on Vercel with an http forwarded proto', { VERCEL: '1' }, { 'x-forwarded-proto': 'http' }, false],
    ['on Vercel even when NEXTAUTH_URL is http', { VERCEL: '1', NEXTAUTH_URL: 'http://x.test' }, {}, true],
    ['with AUTH_TRUST_HOST and http', { AUTH_TRUST_HOST: 'true' }, { 'x-forwarded-proto': 'http' }, false],
    ['off Vercel with an https NEXTAUTH_URL', { NEXTAUTH_URL: 'https://admin.thoth.pub' }, {}, true],
    ['off Vercel with a scheme-less NEXTAUTH_URL', { NEXTAUTH_URL: 'admin.thoth.pub' }, {}, true],
    ['off Vercel with an http NEXTAUTH_URL', { NEXTAUTH_URL: 'http://localhost:3000' }, {}, false],
    ['off Vercel with no NEXTAUTH_URL', {}, {}, false],
  ] as const)('derives the session cookie %s', async (_label, env, headers, secure) => {
    getToken.mockResolvedValue(null);
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);

    await proxy(request('/works', headers));

    expect(getToken).toHaveBeenCalledWith({
      req: expect.any(NextRequest),
      secret: TEST_SECRET,
      secureCookie: secure,
      cookieName: secure ? SECURE : INSECURE,
    });
  });

  it('decodes a real NextAuth session cookie with the derived name and secret', async () => {
    const actual = await vi.importActual<typeof import('next-auth/jwt')>('next-auth/jwt');
    getToken.mockImplementation(actual.getToken);
    vi.stubEnv('VERCEL', '1');
    const cookie = await actual.encode({ token: liveToken(), secret: TEST_SECRET });

    expectNext(await proxy(request('/works', { 'x-forwarded-proto': 'https', cookie: `${SECURE}=${cookie}` })));
    // The same cookie under the non-secure name is not the session NextAuth reads here.
    expectLoginRedirect(
      await proxy(request('/works', { 'x-forwarded-proto': 'https', cookie: `${INSECURE}=${cookie}` })),
    );
  });

  it('treats a cookie sealed with a different secret as signed out', async () => {
    const actual = await vi.importActual<typeof import('next-auth/jwt')>('next-auth/jwt');
    getToken.mockImplementation(actual.getToken);
    vi.stubEnv('VERCEL', '1');
    const cookie = await actual.encode({ token: liveToken(), secret: 'some-other-secret' });

    expectLoginRedirect(await proxy(request('/works', { cookie: `${SECURE}=${cookie}` })));
  });
});

describe('proxy matcher', () => {
  it('is unchanged', () => {
    expect(config).toEqual({
      matcher: ['/', '/admin/:path*', '/dashboard', '/publisher', '/series', '/sets', '/works/:path*'],
    });
  });
});
