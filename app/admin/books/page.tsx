import { redirect } from 'next/navigation';

import { WorksService } from '@/app/services';
import { auth } from '@/auth';
import { ROUTES } from '@/constants';
import { convertLinkedPublishers, query } from '@/utils';

const worksService = new WorksService(query);

export default async function BooksPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];

  const books = await worksService.getBooks(linkedPublishers);

  return (
    <ul>
      {books.map(({ id, title, type, updatedAt, contributorsNames, doi, publisherName }) => (
        <li key={id} className="flex flex-col gap-2">
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
