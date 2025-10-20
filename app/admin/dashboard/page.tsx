import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { auth } from '@/auth';
import { GET_SERIES_COUNT } from '@/src/entities/series/model/series.schema';
import { GET_WORKS_COUNT } from '@/src/entities/work/model/work.schema';
import { convertLinkedPublishers } from '@/src/shared';
import { ROUTES } from '@/src/shared/constants';
import { PreloadQuery } from '@/src/shared/graphqlClient';
import Dashboard from '@/src/widgets/Dashboard/Dashboard';

export default async function DashboardPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const activePublisher = linkedPublishers.slice(0, 1);

  return (
    <PreloadQuery query={GET_WORKS_COUNT} variables={{ publishers: activePublisher }}>
      <PreloadQuery query={GET_SERIES_COUNT} variables={{ publishers: activePublisher }}>
        <Suspense fallback={<p>loading...</p>}>
          <Dashboard />
        </Suspense>
      </PreloadQuery>
    </PreloadQuery>
  );
}
