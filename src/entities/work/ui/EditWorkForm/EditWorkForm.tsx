'use client';

import { FormHeader } from './components/FormHeader';
import { WorkBasicDetailsForm } from './components/WorkBasicDetailsForm';
import { WorkDescriptionsDetailsForm } from './components/WorkDescriptionsDetailsForm';

const EditWorkForm = () => {
  return (
    <div className="flex flex-col gap-8">
      <FormHeader />
      <WorkBasicDetailsForm />
      <WorkDescriptionsDetailsForm />
    </div>
  );
};

export default EditWorkForm;
