import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ROUTES } from '@/constants';

const AdminLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const session = await auth();

  if (!session) {
    redirect(ROUTES.LOGIN);
  }

  return <main>{children}</main>;
};

export default AdminLayout;
