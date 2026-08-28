import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

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
export async function proxy(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    // Redirect to the sign-in page, potentially with a callback URL
    const signInUrl = new URL(ROUTES.LOGIN, request.url);
    // signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
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
