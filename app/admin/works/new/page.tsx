// import { ImprintService } from '@/src/entities/imprint';
import { CreateWorkForm } from '@/src/entities/work';
import { licenseOptions } from '@/src/shared/constants/formFields';

// const imprintsService = new ImprintService();
// TODO: publishers
export default async function NewWorkPage() {
  // if (!session || !session.user) {
  //   redirect(ROUTES.LOGIN);
  // }

  // const linkedPublishers = session.user.linkedPublishers ? convertLinkedPublishers(session.user.linkedPublishers) : [];
  // const isUserAdmin = isAdmin(session);

  // const imprints = await imprintsService.getAllImprints({ publishersIds: isUserAdmin ? [] : linkedPublishers });
  // const imprintOptions = convertEntityToSelectFieldOptions(imprints, 'name');

  return <CreateWorkForm imprintOptions={[]} licenseOptions={licenseOptions} />;
}
