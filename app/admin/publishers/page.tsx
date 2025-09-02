import { redirect } from 'next/navigation';

import { PublishersService } from '@/app/services';
import { auth } from '@/auth';
import { ROUTES } from '@/constants';
import { query } from '@/graphqlClient';
import { convertLinkedPublishers, isAdmin } from '@/utils';

const publishersService = new PublishersService(query);

export default async function PublishersPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const isUserAdmin = isAdmin(session);

  const publications = await publishersService.getPublishers(isUserAdmin ? [] : linkedPublishers);

  return (
    <ul className="flex flex-col gap-2">
      {publications.map(({ id, name, shortName, url, updatedAt }) => (
        <li key={id} className="flex gap-2">
          <span>{id}</span>
          <span>{name}</span>
          <span>{shortName}</span>
          <span>{url}</span>
          <span>{updatedAt}</span>
        </li>
      ))}
    </ul>
  );
}
