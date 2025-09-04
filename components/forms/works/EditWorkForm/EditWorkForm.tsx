'use client';

import { BasicDetailsForm, DescriptionsDetailsForm, FormHeader } from './components';

const EditWorkForm = () => {
  return (
    <div className="flex flex-col gap-8">
      <FormHeader />
      <BasicDetailsForm />
      <DescriptionsDetailsForm />
    </div>
  );
};

export default EditWorkForm;
