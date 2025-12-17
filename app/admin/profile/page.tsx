import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ROUTES } from '@/src/shared/constants';
import { Profile } from '@/src/widgets';

export default async function NewWorkPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  return <Profile />;
}
