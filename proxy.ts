import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { ROUTES } from './src/shared/constants';
import { authOptions } from './src/shared/lib/auth/auth';

// APP-ADM-01 (ADR-0010): session gating only.
//
// The proxy is responsible for "is this request signed in?" and nothing else. It
// deliberately does NOT decide who may enter Admin: superuser truth belongs to
// the backend-owned `me` query, and duplicating it here - or parsing ZITADEL
// claims for it - would create a second, drifting authorization policy. Admin
// authorization is resolved by the Admin access gate against that authoritative
// identity, and the Thoth API remains the actual authorization boundary.
//
// Two redirects were removed as part of the namespace migration: `/admin` no
// longer bounces to `/`, because `/admin` is now a real Admin home; and an
// authenticated `/` is no longer pushed to a publisher dashboard, because `/` is
// now the role-resolution landing that decides between Admin and the workspace.
//
// APP-AUTH-REFRESH-HOTFIX-01 (#292): the session is read with `getToken`, which
// only decodes the session cookie. It must never be read with `getServerSession`
// here: that runs the authOptions `jwt` callback, which spends ZITADEL's rotating
// refresh token in a context whose replacement session cookie is discarded. A
// request is treated as signed out when the token is missing, carries a refresh
// error, has no access token, or its access token expires within the margin
// below - so every server component behind this matcher sees a live token and
// its own `jwt` callback has no reason to refresh.
const ACCESS_TOKEN_EXPIRY_MARGIN_MS = 60_000;

// Mirrors the secret NextAuth resolves for `getServerSession` and the route
// handler: authOptions.secret, else NEXTAUTH_SECRET, else AUTH_SECRET
// (next-auth 4.24.13 next/index.js).
function sessionSecret(): string | undefined {
  return authOptions.secret ?? process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
}

// Mirrors how NextAuth names the session cookie it writes and reads for this
// request (next-auth 4.24.13): core/init.js uses `authOptions.useSecureCookies`,
// else whether the request origin is https; the origin comes from
// utils/detect-origin.js (forwarded host and protocol when VERCEL or
// AUTH_TRUST_HOST is set, otherwise NEXTAUTH_URL) as normalised by
// utils/parse-url.js. `getToken`'s own default (NEXTAUTH_URL, then VERCEL) can
// disagree with that, so the result is passed to it explicitly.
function usesSecureCookies(request: NextRequest): boolean {
  if (authOptions.useSecureCookies != null) return authOptions.useSecureCookies;

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? undefined;
  const protocol = request.headers.get('x-forwarded-proto') ?? undefined;
  let origin =
    (process.env.VERCEL ?? process.env.AUTH_TRUST_HOST)
      ? `${protocol === 'http' ? 'http' : 'https'}://${host}`
      : process.env.NEXTAUTH_URL;
  if (origin && !origin.startsWith('http')) origin = `https://${origin}`;

  return new URL(origin ?? 'http://localhost:3000/api/auth').origin.startsWith('https://');
}

async function isSignedIn(request: NextRequest): Promise<boolean> {
  const secureCookie = usesSecureCookies(request);
  const token = await getToken({
    req: request,
    secret: sessionSecret(),
    secureCookie,
    cookieName:
      authOptions.cookies?.sessionToken?.name ??
      (secureCookie ? '__Secure-next-auth.session-token' : 'next-auth.session-token'),
  });

  if (!token || token.error != null || !token.accessToken) return false;

  // `expiresAt` is stored in milliseconds by the authOptions `jwt` callback. A
  // missing or non-numeric value cannot be shown to be live, so it is signed out.
  const { expiresAt } = token;
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return false;

  return expiresAt - ACCESS_TOKEN_EXPIRY_MARGIN_MS > Date.now();
}

export async function proxy(request: NextRequest) {
  let signedIn = false;
  try {
    signedIn = await isSignedIn(request);
  } catch {
    // An unreadable request (e.g. an unparseable origin) is treated as signed out.
    signedIn = false;
  }

  if (!signedIn) {
    // Redirect to the sign-in page with the requested path as the return target.
    // It is only a proposal: the auth `redirect` callback carries it back through
    // the `/` landing, which alone decides whether it is followed (ADR-0010
    // amendment D2, thoth-app#285).
    const signInUrl = new URL(ROUTES.LOGIN, request.url);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

// Matched paths must be literals so Next.js can analyse them statically. These
// are the authenticated surfaces: the role-resolution landing, the Admin
// namespace, and the root-level publisher workspace routes.
export const config = {
  matcher: ['/', '/admin/:path*', '/dashboard', '/publisher', '/series', '/sets', '/works/:path*'],
};
