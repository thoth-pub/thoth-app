import { redirect } from 'next/navigation';

import { SeriesService } from '@/app/services';
import { auth } from '@/auth';
import { ROUTES } from '@/constants';
import { query } from '@/graphqlClient';
import { convertLinkedPublishers, isAdmin } from '@/utils';

const seriesService = new SeriesService(query);

export default async function SeriesPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const isUserAdmin = isAdmin(session);

  const series = await seriesService.getSeries(isUserAdmin ? [] : linkedPublishers);

  return (
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
  );
}
