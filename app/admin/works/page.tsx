import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ROUTES } from '@/src/shared/constants';
import AllWorks from '@/src/widgets/AllWorks/AllWorks';
import { convertEntityToSelectFieldOptions, convertLinkedPublishers, isAdmin } from '@/src/shared/utils';
import { ImprintService } from '@/src/entities/imprint';
import { query } from '@/src/shared/graphqlClient';
import { SeriesService } from '@/src/entities/series';

const imprintsService = new ImprintService(query);
const seriesService = new SeriesService(query);

export default async function WorksPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const isUserAdmin = isAdmin(session);

  const imprints = await imprintsService.getAllImprints({ publishersIds: isUserAdmin ? [] : linkedPublishers });
  const imprintOptions = convertEntityToSelectFieldOptions(imprints, 'name');

  const serieses = await seriesService.getAllSerieses({
    publishersIds: isUserAdmin ? [] : linkedPublishers,
  });

  return <AllWorks imprintsOptions={imprintOptions} serieses={serieses} />;
}
