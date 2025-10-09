import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { auth } from '@/auth';
import { GET_WORKS } from '@/src/entities/work/model/work.schema';
import { ROUTES } from '@/src/shared/constants';
import { PreloadQuery } from '@/src/shared/graphqlClient';
import { convertLinkedPublishers } from '@/src/shared/utils';
import { AllWorks } from '@/src/widgets';

export default async function WorksPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const activePublisher = linkedPublishers.slice(0, 1);

  return (
    <PreloadQuery query={GET_WORKS} variables={{ publishers: activePublisher }}>
      <Suspense fallback={<p>loading...</p>}>
        <AllWorks />
      </Suspense>
    </PreloadQuery>
  );
}
