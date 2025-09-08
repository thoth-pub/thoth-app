import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { WorkService } from '@/src/entities/work';
import { ROUTES } from '@/src/shared/constants';
import { query } from '@/src/shared/graphqlClient';
import { convertLinkedPublishers } from '@/src/shared/utils';

const worksService = new WorkService(query);

export default async function ChaptersPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];

  const chapters = await worksService.getChapters(linkedPublishers);

  return (
    <ul className="flex flex-col gap-2">
      {chapters.map(({ id, title, type, updatedAt, contributorsNames, doi, publisherName }) => (
        <li key={id} className="flex gap-2">
          <span>{id}</span>
          <span>{title}</span>
          <span>{type}</span>
          <span>{contributorsNames.join(', ')}</span>
          <span>{doi}</span>
          <span>{publisherName}</span>
          <span>{updatedAt}</span>
        </li>
      ))}
    </ul>
  );
}
