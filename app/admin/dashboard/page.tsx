import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ROUTES } from '@/src/shared/constants';
import Dashboard from '@/src/widgets/Dashboard/Dashboard';

export default async function DashboardPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  return <Dashboard />;
}
