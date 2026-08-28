import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Suspense } from 'react';

import { ROUTES } from '@/src/shared/constants';
import { authOptions } from '@/src/shared/lib/auth/auth';
import AllWorks from '@/src/widgets/AllWorks/AllWorks';

export default async function WorksPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect(ROUTES.LOGIN);

  return (
    <Suspense>
      <AllWorks />
    </Suspense>
  );
}
