import { redirect } from 'next/navigation';

import { ImprintsService } from '@/app/services';
import { auth } from '@/auth';
import { CreateWorkForm } from '@/components';
import { ROUTES } from '@/constants';
import { query } from '@/graphqlClient';
import { convertLinkedPublishers, isAdmin } from '@/utils';

const imprintsService = new ImprintsService(query);

export default async function NewWorkPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const isUserAdmin = isAdmin(session);

  const imprints = await imprintsService.getAllImprints({ publishersIds: isUserAdmin ? [] : linkedPublishers });

  return <CreateWorkForm imprints={imprints} />;
}
