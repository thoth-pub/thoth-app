import { CreateWorkForm, PageHeader } from '@/components';
import { ROUTES } from '@/constants';

export default function NewWorkPage() {
  return (
    <>
      <PageHeader title="Name of work" link={ROUTES.WORK_PAGE('1')} buttonText="Create" />
      <CreateWorkForm />
    </>
  );
}
