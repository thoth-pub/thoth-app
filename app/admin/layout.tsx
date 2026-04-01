import { Navigation } from '@/src/features';

const AdminLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <>
      <Navigation />
      <div className="scrollbar-hidden flex-1 overflow-scroll">{children}</div>
    </>
  );
};

export default AdminLayout;
