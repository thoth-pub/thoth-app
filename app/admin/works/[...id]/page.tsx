import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ImprintService } from '@/src/entities/imprint';
import { WorkService } from '@/src/entities/work';
import {
  convertEntityToSelectFieldOptions,
  convertFormFieldsToSelectFieldOptions,
  convertLinkedPublishers,
  isAdmin,
} from '@/src/shared';
import { ROUTES, WorkStatuses, WorkTypes } from '@/src/shared/constants';
import { query } from '@/src/shared/graphqlClient';
import { EditWorkWidget } from '@/src/widgets';

type WorksPageParams = Promise<{
  id: string[];
}>;

const worksService = new WorkService(query);
const imprintsService = new ImprintService(query);

export default async function WorkPage({ params }: { params: WorksPageParams }) {
  const {
    id: [id],
  } = await params;

  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const work = await worksService.getWork(id);

  if (!work) {
    redirect(ROUTES.NOT_FOUND);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const isUserAdmin = isAdmin(session);

  const imprints = await imprintsService.getAllImprints({ publishersIds: isUserAdmin ? [] : linkedPublishers });

  const imprintOptions = convertEntityToSelectFieldOptions(imprints, 'name');
  const workStatusOptions = convertFormFieldsToSelectFieldOptions(WorkStatuses.options);
  const workTypeOptions = convertFormFieldsToSelectFieldOptions(WorkTypes.options);

  return (
    <EditWorkWidget
      queryToken={session.user.queryToken}
      work={work}
      workStatusOptions={workStatusOptions}
      imprintOptions={imprintOptions}
      workTypeOptions={workTypeOptions}
    />
  );
}
