import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { auth } from '@/auth';
import TestList from '@/delete/dev/testList';
import { GET_INSTITUTIONS, GET_INSTITUTIONS_COUNT } from '@/src/entities/institution';
import { ROUTES } from '@/src/shared';
import { appConfig } from '@/src/shared/config';
import { PreloadQuery } from '@/src/shared/graphqlClient';

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
          limit: appConfig.data.itemsPerRequestLimit,
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
