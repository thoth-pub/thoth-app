'use client';

import { useTranslation } from 'react-i18next';

import { IDs } from '@/src/shared/constants';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import type { FormFieldOption, QueryToken } from '@/src/shared/interfaces';
import { AutocompleteGroup, Button, CircularProgress, PageHeader } from '@/src/shared/ui';
import { getWorkTypeOptions } from '@/src/shared/utils';

import CreateWorkFormAutocompleteField from './components/CreateWorkFormAutocompleteField';
import CreateWorkFormField from './components/CreateWorkFormField';
import useCreateWorkForm from './useCreateWorkForm';

const { TITLE, LICENSE, IMPRINT, WORK_TYPE } = FORM_FIELDS;
const { CREATE_WORK } = IDs;

type CreateWorkFormProps = {
  imprintOptions: FormFieldOption[];
  licenseOptions: FormFieldOption[];
  queryToken: QueryToken;
};

const CreateWorkForm = ({ imprintOptions, licenseOptions, queryToken }: CreateWorkFormProps) => {
  const { i18n } = useTranslation();

  const workTypeOptions = getWorkTypeOptions(i18n.language);

  const { control, isImprintVisible, isSubmitDisabled, isLoading, availableNewWorkOptions, submit } = useCreateWorkForm(
    {
      imprintOptions,
      workTypeOptions,
      licenseOptions,
      queryToken,
    },
  );

  return (
    <>
      <PageHeader title="New work">
        <Button
          variant="contained"
          disabled={isSubmitDisabled}
          type="submit"
          form={CREATE_WORK}
          loading={isLoading}
          loadingIndicator={<CircularProgress size={22} sx={{ color: 'inherit' }} />}
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
          options={availableNewWorkOptions}
        />
        <CreateWorkFormAutocompleteField
          label={LICENSE.label}
          name={LICENSE.name}
          control={control}
          options={licenseOptions}
          groupBy={(option) => option.group ?? ''}
          renderGroup={({ group, children, key }) => (
            <AutocompleteGroup key={key} group={group}>
              {children}
            </AutocompleteGroup>
          )}
        />
      </form>
    </>
  );
};

export default CreateWorkForm;
