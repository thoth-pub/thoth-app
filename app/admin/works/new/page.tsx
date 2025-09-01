import { CreateWorkForm,PageHeader } from '@/components';
import { ROUTES } from '@/constants';
import { generateFakeWorkId } from '@/utils/entities';

export default function NewWorkPage() {
  const workId = generateFakeWorkId();

  return (
    <>
      <PageHeader title="Name of work" link={ROUTES.WORK_PAGE(workId)} buttonText="Create" />
      <CreateWorkForm />
    </>
  );
}
