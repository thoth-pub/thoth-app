import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { ROUTES } from './src/shared/constants';
import { authOptions } from './src/shared/lib/auth/auth';

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === ROUTES.ADMIN) {
    return NextResponse.redirect(new URL(ROUTES.ROOT, request.url));
  }

  const session = await getServerSession(authOptions); // Get the session

  // Check the session existence to optimistically redirect
  if (!session) {
    // Redirect to the sign-in page, potentially with a callback URL
    const signInUrl = new URL(ROUTES.LOGIN, request.url);
    // signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (
    session &&
    !request.nextUrl.pathname.startsWith(ROUTES.ADMIN) &&
    !request.nextUrl.pathname.startsWith(ROUTES.LOGOUT_ERROR)
  ) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/'],
};
