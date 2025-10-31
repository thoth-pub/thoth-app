import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ROUTES } from '@/src/shared/constants';
import AllWorks from '@/src/widgets/AllWorks/AllWorks';

export default async function WorksPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  return <AllWorks />;
}
