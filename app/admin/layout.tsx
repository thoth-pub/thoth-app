import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ChangeActivePublisher } from '@/src/features';
import { PAGES, ROUTES } from '@/src/shared/constants';

const AdminLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const session = await auth();

  if (!session) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <>
      <aside>
        <ul className="flex h-full flex-col gap-2 border-r-2 border-r-[var(--color-border)] p-4">
          <ChangeActivePublisher />
          {PAGES.map(({ name, href }) => (
            <li key={href}>
              <Link href={href}>{name}</Link>
            </li>
          ))}
        </ul>
      </aside>
      <div className="flex-1 overflow-clip">{children}</div>
    </>
  );
};

export default AdminLayout;
