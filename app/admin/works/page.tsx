import { redirect } from 'next/navigation';

import { WorksService } from '@/app/services';
import { auth } from '@/auth';
import { Link, PageHeader } from '@/components';
import { ROUTES } from '@/constants';
import { query } from '@/graphqlClient';
import { convertLinkedPublishers } from '@/utils';

import { NewWorkLink } from './components';

const worksService = new WorksService(query);

export default async function WorksPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];

  const works = await worksService.getWorks(linkedPublishers);

  return (
    <>
      <PageHeader title="Name of work">
        <NewWorkLink />
      </PageHeader>
      <ul className="flex flex-col gap-2">
        {works.map(({ id, title, type, updatedAt, contributorsNames, doi, publisherName }) => (
          <li key={id}>
            <Link href={ROUTES.WORK_PAGE(id)} className="flex gap-2">
              <span>{id}</span>
              <span>{title}</span>
              <span>{type}</span>
              <span>{contributorsNames.join(', ')}</span>
              <span>{doi}</span>
              <span>{publisherName}</span>
              <span>{updatedAt}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
