import { redirect } from 'next/navigation';

import { WorkService } from '@/src/entities/work/api/work.service';
import { ROUTES } from '@/src/shared/constants';
import { EditWorkWidget } from '@/src/widgets';

type WorksPageParams = Promise<{
  id: string[];
}>;

const workService = new WorkService();

export default async function WorkPage({ params }: { params: WorksPageParams }) {
  const {
    id: [id],
  } = await params;

  // eslint-disable-next-line no-useless-catch
  try {
    const work = await workService.getWork(id);

    if (!work) {
      redirect(ROUTES.NOT_FOUND);
    }
  } catch (error: unknown) {
    throw error;
  }

  return <EditWorkWidget workId={id} />;
}
