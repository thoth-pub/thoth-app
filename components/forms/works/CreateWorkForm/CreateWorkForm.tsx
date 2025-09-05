'use client';

import { Button, CircullarProgress, PageHeader } from '@/components';
import { FORM_FIELDS, IDs } from '@/constants';
import type { ImprintEntity } from '@/interfaces';

import CreateWorkFormField from './components/CreateWorkFormField';
import { useCreateWorkForm } from './hooks';

const { TITLE, LICENSE, IMPRINT_ID, WORK_TYPE } = FORM_FIELDS;
const { CREATE_WORK } = IDs.FORM_FIELDS;

type CreateWorkFormProps = {
  imprints: ImprintEntity[];
  queryToken: string;
};

const CreateWorkForm = ({ imprints, queryToken }: CreateWorkFormProps) => {
  const { control, workTypesOptions, imprintOptions, isImprintVisible, isSubmitDisabled, isLoading, submit } =
    useCreateWorkForm({
      imprints,
      queryToken,
    });

  return (
    <>
      <PageHeader title="New work">
        <Button
          variant="contained"
          disabled={isSubmitDisabled}
          type="submit"
          form={CREATE_WORK}
          loading={isLoading}
          loadingIndicator={<CircullarProgress size={22} sx={{ color: 'inherit' }} />}
        >
          New
        </Button>
      </PageHeader>
      <form
        id={CREATE_WORK}
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
            label={IMPRINT_ID.label}
            name={IMPRINT_ID.name}
            placeholder={IMPRINT_ID.placeholder}
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
    </>
  );
};

export default CreateWorkForm;
