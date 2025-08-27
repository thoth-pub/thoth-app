import { redirect } from 'next/navigation';

import { InstitutionsService } from '@/app/services';
import { auth } from '@/auth';
import { ROUTES } from '@/constants';
import { query } from '@/utils';

const institutionsService = new InstitutionsService(query);

export default async function InstitutionsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const institutions = await institutionsService.getInstitutions();

  return (
    <ul className="flex flex-col gap-2">
      {institutions.map(({ id, name, doi, ror, countryCode, updatedAt }) => (
        <li key={id} className="flex gap-2">
          <span>{id}</span>
          <span>{name}</span>
          <span>{doi}</span>
          <span>{ror}</span>
          <span>{countryCode}</span>
          <span>{updatedAt}</span>
        </li>
      ))}
    </ul>
  );
}
