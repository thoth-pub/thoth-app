import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { ROUTES } from '@/src/shared/constants';
import { authOptions } from '@/src/shared/lib/auth/auth';
import Dashboard from '@/src/widgets/Dashboard/Dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect(ROUTES.LOGIN);

  return <Dashboard />;
}
