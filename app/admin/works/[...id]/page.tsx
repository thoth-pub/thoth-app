import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { UserService } from '@/src/entities/user';
import { WorkService } from '@/src/entities/work/api/work.service';
import { ROUTES } from '@/src/shared/constants';
import { authOptions } from '@/src/shared/lib/auth/auth';
import { EditWorkWidget } from '@/src/widgets';

type WorksPageParams = Promise<{
  id: string[];
}>;

export default async function WorkPage({ params }: { params: WorksPageParams }) {
  const {
    id: [id],
  } = await params;

  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(ROUTES.NOT_FOUND);
  }

  const token = session.accessToken;

  if (!token) {
    redirect(ROUTES.NOT_FOUND);
  }
  const workService = new WorkService(token);
  const userService = new UserService(token);

  const work = await workService.getWork(id);

  if (!work) {
    redirect(ROUTES.NOT_FOUND);
  }

  const userData = await userService.getUser();

  const isUsersImprint = userData.linkedPublishers.some((publisher) =>
    publisher.imprints.some((imprint) => imprint.imprintId === work.imprintId),
  );

  if (!isUsersImprint && !userData.isSuperuser) {
    redirect(ROUTES.NOT_FOUND);
  }

  return <EditWorkWidget workId={id} />;
}
