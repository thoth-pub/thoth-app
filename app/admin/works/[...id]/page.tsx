import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { EditWorkForm, WorkService } from '@/src/entities/work';
import { ROUTES } from '@/src/shared/constants';
import { query } from '@/src/shared/graphqlClient';

type WorksPageParams = Promise<{
  id: string[];
}>;

const worksService = new WorkService(query);

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

  return <EditWorkForm />;
}
