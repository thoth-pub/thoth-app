import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { ROUTES, WORK_COPY_VARIANTS } from '@/src/shared/constants';
import { authOptions } from '@/src/shared/lib/auth/auth';
import type { WorkCopyVariant } from '@/src/shared/types';
import { CopyWork } from '@/src/widgets';

type CopyWorkPageProps = {
  searchParams: {
    type: WorkCopyVariant;
  };
};

export default async function CopyWorkPage({ searchParams }: CopyWorkPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect(ROUTES.LOGIN);

  const { type = '' } = await searchParams;

  const isNewTranslation = type === WORK_COPY_VARIANTS.TRANSLATION;

  return <CopyWork isTranslation={isNewTranslation} />;
}
