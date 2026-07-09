import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { ROUTES } from '@/src/shared/constants';
import { authOptions } from '@/src/shared/lib/auth/auth';
import { CreateWorkForm } from '@/src/entities/work';

export default async function NewWorkPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect(ROUTES.LOGIN);

  return <CreateWorkForm />;
}
