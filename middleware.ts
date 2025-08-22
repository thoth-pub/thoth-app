import { auth } from '@/auth';
import { ROUTES } from '@/constants';

export default auth((req) => {
  if (req.nextUrl.pathname === ROUTES.ROOT) {
    const newUrl = new URL(ROUTES.ADMIN, req.nextUrl.origin);

    return Response.redirect(newUrl);
  }
});
