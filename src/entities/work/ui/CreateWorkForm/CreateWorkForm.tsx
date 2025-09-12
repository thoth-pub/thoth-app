'use client';

import { IDs } from '@/src/shared/constants';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import type { FormFieldOption, QueryToken } from '@/src/shared/interfaces';
import { Button, CircullarProgress, PageHeader } from '@/src/shared/ui';

import CreateWorkFormAutocompleteField from './components/CreateWorkFormAutocompleteField';
import CreateWorkFormField from './components/CreateWorkFormField';
import useCreateWorkForm from './useCreateWorkForm';

const { TITLE, LICENSE, IMPRINT, WORK_TYPE } = FORM_FIELDS;
const { CREATE_WORK } = IDs.FORM_FIELDS;

type CreateWorkFormProps = {
  imprintOptions: FormFieldOption[];
  workTypeOptions: FormFieldOption[];
  licenseOptions: FormFieldOption[];
  queryToken: QueryToken;
};

const CreateWorkForm = ({ imprintOptions, licenseOptions, workTypeOptions, queryToken }: CreateWorkFormProps) => {
  const { control, isImprintVisible, isSubmitDisabled, isLoading, submit } = useCreateWorkForm({
    imprintOptions,
    workTypeOptions,
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
          options={workTypeOptions}
        />
        <CreateWorkFormAutocompleteField
          label={LICENSE.label}
          name={LICENSE.name}
          placeholder={LICENSE.placeholder}
          control={control}
          options={licenseOptions}
        />
      </form>
    </>
  );
};

export default CreateWorkForm;
