import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ImprintService } from '@/src/entities/imprint';
import { ROUTES } from '@/src/shared/constants';
import { query } from '@/src/shared/graphqlClient';
import { convertEntityToSelectFieldOptions, convertLinkedPublishers, isAdmin } from '@/src/shared/utils';
import { Series } from '@/src/widgets';

const imprintsService = new ImprintService(query);

export default async function SeriesPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const isUserAdmin = isAdmin(session);

  const imprints = await imprintsService.getAllImprints({ publishersIds: isUserAdmin ? [] : linkedPublishers });
  const imprintOptions = convertEntityToSelectFieldOptions(imprints, 'name');

  return <Series imprintOptions={imprintOptions} queryToken={session.user.queryToken} />;
}
