import { redirect } from 'next/navigation';

import { ImprintsService } from '@/app/services';
import { auth } from '@/auth';
import { ROUTES } from '@/constants';
import { query } from '@/graphqlClient';
import { convertLinkedPublishers } from '@/utils';

const imprintsService = new ImprintsService(query);

export default async function ImprintsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const isAdmin = session.user.isSuperAdmin;

  const imprints = await imprintsService.getImprints(isAdmin ? [] : linkedPublishers);

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
