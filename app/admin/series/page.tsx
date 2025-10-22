import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ImprintService } from '@/src/entities/imprint';
import { EditSeriesForm, SeriesService } from '@/src/entities/series';
import { ROUTES } from '@/src/shared/constants';
import { query } from '@/src/shared/graphqlClient';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';
import { convertEntityToSelectFieldOptions, convertLinkedPublishers, isAdmin } from '@/src/shared/utils';

const seriesService = new SeriesService(query);
const imprintsService = new ImprintService(query);

export default async function SeriesPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const isUserAdmin = isAdmin(session);

  const series = await seriesService.getSeries(isUserAdmin ? [] : linkedPublishers);
  const imprints = await imprintsService.getAllImprints({ publishersIds: isUserAdmin ? [] : linkedPublishers });
  const imprintOptions = convertEntityToSelectFieldOptions(imprints, 'name');

  return (
    <ContentSection title="Series">
      <ul className="flex flex-col gap-2">
        {series.map(({ id, name, type, issnPrint, issnDigital, updatedAt }) => (
          <li key={id} className="flex gap-2">
            <span>{id}</span>
            <span>{name}</span>
            <span>{type}</span>
            <span>{issnPrint}</span>
            <span>{issnDigital}</span>
            <span>{updatedAt}</span>
          </li>
        ))}
      </ul>
      <EditSeriesForm queryToken={session.user.queryToken} imprintOptions={imprintOptions} />
    </ContentSection>
  );
}
