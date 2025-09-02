'use client';

import { FORM_FIELDS } from '@/constants';

import CreateWorkFormField from './components/CreateWorkFormField';
import { useCreateWorkForm } from './hooks';

const { TITLE, LICENSE, IMPRINT, WORK_TYPE } = FORM_FIELDS;

const CreateWorkForm = () => {
  const { control, workTypes, submit } = useCreateWorkForm();

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-[var(--default-gap)] rounded-md border-2 border-[var(--color-border-alt)] bg-[var(--color-background-alt)] p-[var(--default-content-padding)]"
    >
      <CreateWorkFormField
        label={TITLE.label}
        name={TITLE.name}
        placeholder={TITLE.placeholder}
        control={control}
        type={TITLE.type}
      />
      <CreateWorkFormField
        label={IMPRINT.label}
        name={IMPRINT.name}
        placeholder={IMPRINT.placeholder}
        control={control}
        select
        disabled={workTypes.length === 0}
        options={workTypes}
        defaultValue={workTypes[0].value}
      />
      <CreateWorkFormField
        label={WORK_TYPE.label}
        name={WORK_TYPE.name}
        placeholder={WORK_TYPE.placeholder}
        control={control}
        select
        options={workTypes}
        defaultValue={workTypes[0].value}
      />
      <CreateWorkFormField
        label={LICENSE.label}
        name={LICENSE.name}
        placeholder={LICENSE.placeholder}
        control={control}
        type={LICENSE.type}
      />
      <button type="submit">Submit</button>
    </form>
  );
};

export default CreateWorkForm;
