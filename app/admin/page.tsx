import { auth } from '@/auth';
import { ROUTES } from '@/constants';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    redirect(ROUTES.LOGIN);
  }

  return <div>Thoth Admin Page</div>;
}
