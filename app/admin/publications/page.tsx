import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { PublicationService } from '@/src/entities/publication';
import { ROUTES } from '@/src/shared/constants';
import { query } from '@/src/shared/graphqlClient';
import { convertLinkedPublishers } from '@/src/shared/utils';

const publicationsService = new PublicationService(query);

export default async function PublicationsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];

  const publications = await publicationsService.getPublications(linkedPublishers);

  return (
    <ul className="flex flex-col gap-2">
      {publications.map(({ id, title, type, updatedAt, isbn, doi, publisherName }) => (
        <li key={id} className="flex gap-2">
          <span>{id}</span>
          <span>{title}</span>
          <span>{doi}</span>
          <span>{publisherName}</span>
          <span>{type}</span>
          <span>{isbn}</span>
          <span>{updatedAt}</span>
        </li>
      ))}
    </ul>
  );
}
