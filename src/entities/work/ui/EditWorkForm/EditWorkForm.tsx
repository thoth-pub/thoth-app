import { convertFormFieldsToSelectFieldOptions, WorkStatus } from '@/src/shared';

import { FormHeader } from './components/FormHeader';
import { WorkBasicDetailsForm } from './components/WorkBasicDetailsForm';
import { WorkDescriptionsDetailsForm } from './components/WorkDescriptionsDetailsForm';

const EditWorkForm = () => {
  const workStatusOptions = convertFormFieldsToSelectFieldOptions(WorkStatus.options);

  return (
    <div className="flex flex-col gap-8">
      <FormHeader workStatusOptions={workStatusOptions} />
      <WorkBasicDetailsForm />
      <WorkDescriptionsDetailsForm />
    </div>
  );
};

export default EditWorkForm;
