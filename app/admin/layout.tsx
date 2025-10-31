import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { Navigation } from '@/src/features';
import { ROUTES } from '@/src/shared/constants';

const AdminLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const session = await auth();

  if (!session) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishersId = session.user.linkedPublishers.map((publisher) => publisher.publisherId);

  return (
    <>
      <Navigation linkedPublishers={linkedPublishersId} />
      <div className="scrollbar-hidden flex-1 overflow-scroll">{children}</div>
    </>
  );
};

export default AdminLayout;
