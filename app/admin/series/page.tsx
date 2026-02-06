// import { redirect } from 'next/navigation';

// import { ImprintService } from '@/src/entities/imprint';
// import { ROUTES } from '@/src/shared/constants';
// import { convertEntityToSelectFieldOptions } from '@/src/shared/utils';
import { Series } from '@/src/widgets';

// const imprintsService = new ImprintService();

export const dynamic = 'force-dynamic';
// TODO: publishers
export default async function SeriesPage() {
  // const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  // const isUserAdmin = isAdmin(session);

  // const imprints = await imprintsService.getAllImprints({ publishersIds: isUserAdmin ? [] : linkedPublishers });
  // const imprintOptions = convertEntityToSelectFieldOptions(imprints, 'name');

  return <Series imprintOptions={[]} />;
}
