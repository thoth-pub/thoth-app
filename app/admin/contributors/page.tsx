import { redirect } from 'next/navigation';

import { ContributorsService } from '@/app/services';
import { auth } from '@/auth';
import { ROUTES } from '@/constants';
import { query } from '@/graphqlClient';

const contributorsService = new ContributorsService(query);

export default async function ContributorsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const contributors = await contributorsService.getContributors();

  return (
    <ul className="flex flex-col gap-2">
      {contributors.map(({ id, name, orcid, updatedAt }) => (
        <li key={id} className="flex gap-2">
          <span>{id}</span>
          <span>{name}</span>
          <span>{orcid}</span>
          <span>{updatedAt}</span>
        </li>
      ))}
    </ul>
  );
}
