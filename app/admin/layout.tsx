import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { PAGES, ROUTES } from '@/constants';

import Template from './template';

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
          {PAGES.map(({ name, href }) => (
            <li key={href}>
              <Link href={href}>{name}</Link>
            </li>
          ))}
        </ul>
      </aside>
      <div className="overflow-clip">
        <Template>{children}</Template>
      </div>
    </>
  );
};

export default AdminLayout;
