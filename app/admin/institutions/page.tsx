import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { GET_INSTITUTIONS, GET_INSTITUTIONS_COUNT } from '@/app/queries';
import { auth } from '@/auth';
import { config } from '@/config';
import { ROUTES } from '@/constants';
import { PreloadQuery } from '@/graphqlClient';

import TestList from '../../../components/dev/testList';

export default async function InstitutionsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <div className="flex flex-col gap-2">
      <PreloadQuery
        query={GET_INSTITUTIONS}
        variables={{
          offset: 0,
          limit: config.data.itemsPerRequestLimit,
        }}
      >
        <PreloadQuery query={GET_INSTITUTIONS_COUNT}>
          <Suspense fallback={<p>loading...</p>}>
            <TestList />
          </Suspense>
        </PreloadQuery>
      </PreloadQuery>
    </div>
  );
}
