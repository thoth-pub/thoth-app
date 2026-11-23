import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { ROUTES } from '@/src/shared/constants';
import { authOptions } from '@/src/shared/lib/auth/auth';
import { ContributorAdministration } from '@/src/widgets';

// APP-ADM-CONTRIB-01: superuser contributor administration. Like the other /admin pages the
// server component only enforces the signed-in requirement; the Admin layout gate and the widget
// keep every staff read/write disabled until authoritative client user state confirms a
// superuser, and the Thoth API remains the actual authorization boundary.
export default async function ContributorsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect(ROUTES.LOGIN);

  return <ContributorAdministration />;
}
