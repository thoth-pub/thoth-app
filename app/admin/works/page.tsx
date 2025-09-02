import AddIcon from '@mui/icons-material/Add';
import { redirect } from 'next/navigation';

import { WorksService } from '@/app/services';
import { auth } from '@/auth';
import { PageHeader } from '@/components';
import { ROUTES } from '@/constants';
import { query } from '@/graphqlClient';
import { convertLinkedPublishers } from '@/utils';

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
      <PageHeader title="Name of work" link={ROUTES.NEW_WORK} buttonText="New" startIcon={<AddIcon />} />
      <ul className="flex flex-col gap-2">
        {works.map(({ id, title, type, updatedAt, contributorsNames, doi, publisherName }) => (
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
    </>
  );
}
