import AdminAccessGate from '@/src/features/layout/AdminAccessGate/AdminAccessGate';
import Navigation from '@/src/features/layout/Navigation/Navigation';

// APP-ADM-01 (ADR-0010): the global Admin shell.
//
// The access gate wraps the ENTIRE Admin application, navigation included, so a
// viewer whose identity is not yet authoritative - or who is authoritatively not
// a superuser - never sees Admin navigation, never sees Admin content, and never
// mounts a staff-only data hook. Only the truthful access-denied state is
// rendered in that case, in place of the whole shell.
//
// The backend remains the authorization boundary for everything reached from
// here; this layout decides presentation and access UX only.
const AdminLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <AdminAccessGate>
      <Navigation mode="admin" />
      <div className="scrollbar-hidden flex-1 overflow-scroll">{children}</div>
    </AdminAccessGate>
  );
};

export default AdminLayout;
