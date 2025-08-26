import { redirect } from 'next/navigation';

import { PublishersService } from '@/app/services';
import { auth } from '@/auth';
import { ROUTES } from '@/constants';
import { convertLinkedPublishers, query } from '@/utils';

const publishersService = new PublishersService(query);

export default async function PublishersPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const isAdmin = session.user.isSuperAdmin;

  const publications = await publishersService.getPublishers(isAdmin ? [] : linkedPublishers);

  return (
    <ul>
      {publications.map(({ id, name, shortName, url, updatedAt }) => (
        <li key={id}>
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
