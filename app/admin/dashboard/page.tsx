import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { convertLinkedPublishers } from '@/src/shared';
import { ROUTES } from '@/src/shared/constants';
import Dashboard from '@/src/widgets/Dashboard/Dashboard';

export default async function DashboardPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const activePublisher = linkedPublishers.slice(0, 1);

  return <Dashboard />;
}
