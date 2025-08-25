import { redirect } from 'next/navigation';

import { GET_BOOKS } from '@/app/queries';
import { auth } from '@/auth';
import { ROUTES } from '@/constants';
import { convertLinkedPublishers, query } from '@/utils';

export default async function BooksPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];

  const { data } = await query({
    query: GET_BOOKS,
    variables: { publishers: linkedPublishers },
  });

  return (
    <ul>
      {data?.books.map(({ workId, title, workType, updatedAt, contributions, doi, imprint }) => (
        <li key={workId} className="flex flex-col gap-2">
          <span>{workId}</span>
          <span>{title}</span>
          <span>{workType}</span>
          <span>{contributions.map((contribution) => contribution.fullName).join(', ')}</span>
          <span>{doi}</span>
          <span>{imprint.publisher.publisherName}</span>
          <span>{updatedAt}</span>
        </li>
      ))}
    </ul>
  );
}
