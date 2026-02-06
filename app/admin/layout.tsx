import { Navigation } from '@/src/features';

// TODO: publishers
const AdminLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <>
      <Navigation linkedPublishers={[]} isSuperAdmin={true} />
      <div className="scrollbar-hidden flex-1 overflow-scroll">{children}</div>
    </>
  );
};

export default AdminLayout;
