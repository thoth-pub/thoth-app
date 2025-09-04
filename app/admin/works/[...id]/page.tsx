import { redirect } from 'next/navigation';

import { WorksService } from '@/app/services/worksService/worksService';
import { auth } from '@/auth';
import { EditWorkForm } from '@/components';
import { ROUTES } from '@/constants';
import { query } from '@/graphqlClient';

type WorksPageParams = Promise<{
  id: string[];
}>;

const worksService = new WorksService(query);

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
