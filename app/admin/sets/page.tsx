import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ImprintService } from '@/src/entities/imprint';
import { convertEntityToSelectFieldOptions, convertLinkedPublishers, isAdmin } from '@/src/shared';
import { ROUTES } from '@/src/shared/constants';
import { Sets } from '@/src/widgets';

const imprintsService = new ImprintService();

export default async function SetsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const isUserAdmin = isAdmin(session);

  const imprints = await imprintsService.getAllImprints({ publishersIds: isUserAdmin ? [] : linkedPublishers });
  const imprintOptions = convertEntityToSelectFieldOptions(imprints, 'name');

  return <Sets imprintOptions={imprintOptions} />;
}
