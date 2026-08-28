import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { ROUTES } from '@/src/shared/constants';
import { authOptions } from '@/src/shared/lib/auth/auth';
import { Profile } from '@/src/widgets';

export default async function PublisherPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect(ROUTES.LOGIN);

  return <Profile />;
}
