import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { ROUTES } from '@/src/shared/constants';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { authOptions } from '@/src/shared/lib/auth/auth';
import { ContentSection, TranslatedContent, Typography } from '@/src/shared/ui';

// APP-ADM-01 (ADR-0010): the Admin home.
//
// This slice deliberately ships an orientation-only home. It presents no
// operational data of any kind - no failed/pending/running/success counts, no
// recent activity, no attention counts, no distribution or Metrics state and no
// replay controls - because no authoritative operational read model exists yet.
// Inventing zero/healthy-looking figures here would be untruthful, so nothing is
// shown rather than something unverified.
//
// Access is gated by the Admin layout; this component only enforces the same
// signed-in requirement every other route does.
export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect(ROUTES.LOGIN);

  return (
    <ContentSection>
      <Typography variant="h1">
        <TranslatedContent content="admin" namespace={NAMESPACES.enum.navigation} />
      </Typography>
      <Typography>
        <TranslatedContent content="adminHomeIntro" namespace={NAMESPACES.enum.navigation} />
      </Typography>
    </ContentSection>
  );
}
