import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { PublisherService } from '@/src/entities/publisher';
import { ROUTES } from '@/src/shared/constants';
import { query } from '@/src/shared/graphqlClient';
import { convertLinkedPublishers, isAdmin } from '@/src/shared/utils';

const publishersService = new PublisherService(query);

export default async function PublishersPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const isUserAdmin = isAdmin(session);

  const publications = await publishersService.getPublishers({
    publishersIds: isUserAdmin ? [] : linkedPublishers,
    offset: 0,
  });

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
