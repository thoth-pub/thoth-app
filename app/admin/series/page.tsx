import AddIcon from '@mui/icons-material/Add';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ImprintService } from '@/src/entities/imprint';
import { SeriesTable } from '@/src/entities/series';
import { ROUTES } from '@/src/shared/constants';
import { query } from '@/src/shared/graphqlClient';
import { Button } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';
import { convertEntityToSelectFieldOptions, convertLinkedPublishers, isAdmin } from '@/src/shared/utils';

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

  return (
    <ContentSection title="Series">
      <SeriesTable footerContent={<Button startIcon={<AddIcon />}>Add New Series</Button>} />
      {/* <EditSeriesForm queryToken={session.user.queryToken} imprintOptions={imprintOptions} /> */}
    </ContentSection>
  );
}
