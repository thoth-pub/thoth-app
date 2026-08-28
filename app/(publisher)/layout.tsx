import Navigation from '@/src/features/layout/Navigation/Navigation';

// APP-ADM-01 (ADR-0010): the ordinary publisher workspace shell. This is the
// former `app/admin/layout.tsx` composition, unchanged apart from where it now
// lives and the shell mode it asks for: the publisher workspace no longer sits
// under the `/admin` namespace, which ADR-0010 reserves for global Admin.
const PublisherLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <>
      <Navigation mode="publisher" />
      <div className="scrollbar-hidden flex-1 overflow-scroll">{children}</div>
    </>
  );
};

export default PublisherLayout;
