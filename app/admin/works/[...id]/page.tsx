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

const workService = new WorkService();
const userService = new UserService();

export default async function WorkPage({ params }: { params: WorksPageParams }) {
  const {
    id: [id],
  } = await params;

  const work = await workService.getWork(id);
  const session = await getServerSession(authOptions);

  if (!work || !session) {
    redirect(ROUTES.NOT_FOUND);
  }

  const token = session.accessToken;

  if (!token) {
    redirect(ROUTES.NOT_FOUND);
  }

  const userData = await userService.getUser(token);

  const isUsersImprint = userData.linkedPublishers.some((publisher) =>
    publisher.imprints.some((imprint) => imprint.imprintId === work.imprintId),
  );

  if (!isUsersImprint && !userData.isSuperuser) {
    redirect(ROUTES.NOT_FOUND);
  }

  return <EditWorkWidget workId={id} />;
}
