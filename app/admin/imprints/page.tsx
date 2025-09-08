import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ImprintService } from '@/src/entities/imprint';
import { ROUTES } from '@/src/shared/constants';
import { query } from '@/src/shared/graphqlClient';
import { convertLinkedPublishers, isAdmin } from '@/src/shared/utils';

const imprintsService = new ImprintService(query);

export default async function ImprintsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const isUserAdmin = isAdmin(session);

  const imprints = await imprintsService.getImprints(
    isUserAdmin ? { publishersIds: [] } : { publishersIds: linkedPublishers },
  );

  return (
    <ul className="flex flex-col gap-2">
      {imprints.map(({ id, name, url, publisherName, updatedAt }) => (
        <li key={id} className="flex gap-2">
          <span>{id}</span>
          <span>{name}</span>
          <span>{publisherName}</span>
          <span>{url}</span>
          <span>{updatedAt}</span>
        </li>
      ))}
    </ul>
  );
}
