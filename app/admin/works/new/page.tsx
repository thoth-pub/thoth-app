import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ImprintService } from '@/src/entities/imprint';
import { CreateWorkForm } from '@/src/entities/work';
import { ROUTES } from '@/src/shared/constants';
import { licenseOptions } from '@/src/shared/constants/formFields';
import { convertEntityToSelectFieldOptions, convertLinkedPublishers, isAdmin } from '@/src/shared/utils';

const imprintsService = new ImprintService();

export default async function NewWorkPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect(ROUTES.LOGIN);
  }

  const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  const isUserAdmin = isAdmin(session);

  const imprints = await imprintsService.getAllImprints({ publishersIds: isUserAdmin ? [] : linkedPublishers });
  const imprintOptions = convertEntityToSelectFieldOptions(imprints, 'name');

  return <CreateWorkForm imprintOptions={imprintOptions} licenseOptions={licenseOptions} />;
}
