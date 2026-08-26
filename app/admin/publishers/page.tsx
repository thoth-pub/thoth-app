import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { ROUTES } from '@/src/shared/constants';
import { authOptions } from '@/src/shared/lib/auth/auth';
import { PublisherAdministration } from '@/src/widgets';

// APP-02A: superuser publisher administration index. The server component only
// enforces the existing signed-in requirement, like the other /admin pages; the
// widget keeps the protected staff report/count queries disabled until
// authoritative client user state confirms a superuser, and the backend remains
// the actual authorization boundary.
export default async function PublishersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect(ROUTES.LOGIN);

  return <PublisherAdministration />;
}
