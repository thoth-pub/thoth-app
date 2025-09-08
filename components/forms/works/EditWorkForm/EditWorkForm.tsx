'use client';

import { FormHeader, WorkBasicDetailsForm, WorkDescriptionsDetailsForm } from './components';

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
