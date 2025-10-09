import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { auth } from '@/auth';
import { ImprintService } from '@/src/entities/imprint';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { convertEntityToSelectFieldOptions, isAdmin } from '@/src/shared';
import { ROUTES } from '@/src/shared/constants';
import { workStatusOptions } from '@/src/shared/constants/formFields';
import { getClient, PreloadQuery, query } from '@/src/shared/graphqlClient';
import { EditWorkWidget } from '@/src/widgets';

type WorksPageParams = Promise<{
  id: string[];
}>;

const imprintsService = new ImprintService(query);

export default async function WorkPage({ params }: { params: WorksPageParams }) {
  const {
    id: [id],
  } = await params;

  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const { data } = await getClient().query({ query: GET_WORK, variables: { workId: id } });

  if (!data) {
    redirect(ROUTES.NOT_FOUND);
  }

  const linkedPublishers = session.user.linkedPublishers ? session.user.linkedPublishers : [];
  const isUserAdmin = isAdmin(session);
  const activePublisher = linkedPublishers.slice(0, 1);

  const imprints = await imprintsService.getAllImprints({ publishersIds: isUserAdmin ? [] : activePublisher });

  const imprintOptions = convertEntityToSelectFieldOptions(imprints, 'name');

  return (
    <PreloadQuery query={GET_WORK} variables={{ workId: id }}>
      <Suspense fallback={<p>loading...</p>}>
        <EditWorkWidget
          workId={id}
          queryToken={session.user.queryToken}
          workStatusOptions={workStatusOptions}
          imprintOptions={imprintOptions}
          isAdmin={isUserAdmin}
        />
      </Suspense>
    </PreloadQuery>
  );
}
