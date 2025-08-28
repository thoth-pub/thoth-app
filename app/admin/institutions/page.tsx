import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { GET_INSTITUTIONS } from '@/app/queries';
import { InstitutionsService } from '@/app/services';
import { auth } from '@/auth';
import { config } from '@/config';
import { ROUTES } from '@/constants';
import { PreloadQuery, query } from '@/utils';

import TestList from '../../../components/dev/testList';

const institutionsService = new InstitutionsService(query);

export default async function InstitutionsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const institutionsCount = await institutionsService.getInstitutionsCount();

  return (
    <div className="flex flex-col gap-2">
      <h1>Institutions count: {institutionsCount}</h1>
      <PreloadQuery
        query={GET_INSTITUTIONS}
        variables={{
          offset: 0,
          limit: config.data.itemsPerRequestLimit,
        }}
      >
        <Suspense fallback={<p>loading...</p>}>
          <TestList maxDataCount={institutionsCount} />
        </Suspense>
      </PreloadQuery>
    </div>
  );
}
