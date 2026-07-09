import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { ROUTES } from '@/src/shared/constants';
import { authOptions } from '@/src/shared/lib/auth/auth';
import { Sets } from '@/src/widgets';

export const dynamic = 'force-dynamic';

export default async function SetsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect(ROUTES.LOGIN);

  return (
    <Suspense>
      <Sets />
    </Suspense>
  );
}
