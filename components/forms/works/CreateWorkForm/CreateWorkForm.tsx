'use client';

import { FORM_FIELDS } from '@/constants';
import type { ImprintEntity } from '@/interfaces';

import CreateWorkFormField from './components/CreateWorkFormField';
import { useCreateWorkForm } from './hooks';

const { TITLE, LICENSE, IMPRINT, WORK_TYPE } = FORM_FIELDS;

type CreateWorkFormProps = {
  imprints: ImprintEntity[];
};

const CreateWorkForm = ({ imprints }: CreateWorkFormProps) => {
  const { control, workTypesOptions, imprintOptions, isImprintVisible, submit } = useCreateWorkForm({
    imprints,
  });

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
      {isImprintVisible && (
        <CreateWorkFormField
          label={IMPRINT.label}
          name={IMPRINT.name}
          placeholder={IMPRINT.placeholder}
          control={control}
          select
          options={imprintOptions}
        />
      )}
      <CreateWorkFormField
        label={WORK_TYPE.label}
        name={WORK_TYPE.name}
        placeholder={WORK_TYPE.placeholder}
        control={control}
        select
        options={workTypesOptions}
      />
      <CreateWorkFormField
        label={LICENSE.label}
        name={LICENSE.name}
        placeholder={LICENSE.placeholder}
        control={control}
        type={LICENSE.type}
      />
    </form>
  );
};

export default CreateWorkForm;
