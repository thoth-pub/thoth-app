import { redirect } from 'next/navigation';

// import { ImprintService } from '@/src/entities/imprint';
import { WorkService } from '@/src/entities/work/api/work.service';
import { ROUTES } from '@/src/shared/constants';
import { EditWorkWidget } from '@/src/widgets';

type WorksPageParams = Promise<{
  id: string[];
}>;
// TODO: publishers
// const imprintsService = new ImprintService();
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

  // const linkedPublishers = session.user.linkedPublishers ? session.user.linkedPublishers : [];
  // const isUserAdmin = isAdmin(session);
  // const activePublisher = linkedPublishers.slice(0, 1).map((publisher) => publisher.publisherId);

  // const imprints = await imprintsService.getAllImprints({ publishersIds: isUserAdmin ? [] : activePublisher });

  // const imprintOptions = convertEntityToSelectFieldOptions(imprints, 'name');

  return <EditWorkWidget workId={id} imprintOptions={[]} isAdmin={false} />;
}
