import { auth } from '@/auth';
import { ROUTES } from '@/src/shared/constants';

export default auth((req) => {
  if (req.nextUrl.pathname === ROUTES.ROOT) {
    const newUrl = new URL(ROUTES.DASHBOARD, req.nextUrl.origin);

    return Response.redirect(newUrl);
  }
});

export const config = {
  matcher: ['/'],
};
