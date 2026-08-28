import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import AuthenticatedLanding from '@/src/features/auth/ui/AuthenticatedLanding/AuthenticatedLanding';
import { ROUTES } from '@/src/shared/constants';
import { authOptions } from '@/src/shared/lib/auth/auth';

export const dynamic = 'force-dynamic';

// APP-ADM-01 (ADR-0010): `/` is the authenticated role-resolution landing.
//
// Successful authentication returns here rather than to a publisher dashboard,
// so every new authenticated session passes through one lifecycle boundary that
// resolves the authoritative backend-owned identity before choosing a
// destination. The decision itself is client-side, because role truth comes from
// the authenticated `me` query - see AuthenticatedLanding.
//
// This route is outside the publisher route group on purpose: no publisher shell
// and no active-publisher machinery is mounted while the landing resolves.
export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect(ROUTES.LOGIN);

  return <AuthenticatedLanding />;
}
