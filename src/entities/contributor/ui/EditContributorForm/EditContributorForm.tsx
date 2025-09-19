'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { Button, FormFieldWrapper, FormTextField, InputLabel } from '@/src/shared/ui';

import { type ContributorForm, contributorFormValidationSchema } from '../../model/contributor.validation';

const { FIRST_NAME, LAST_NAME, FULL_NAME, ORCID, WEBSITE_URL } = FORM_FIELDS;

type EditContributorFormProps = {
  onSubmit: (data: ContributorForm) => void;
  defaultValues?: ContributorForm;
  isNew?: boolean;
};

const EditContributorForm = ({ defaultValues, isNew = false, onSubmit }: EditContributorFormProps) => {
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(contributorFormValidationSchema),
    mode: 'onChange',
    defaultValues,
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={handleSubmit(onSubmit)}>
      <FormFieldWrapper>
        <InputLabel>{FIRST_NAME.placeholder}</InputLabel>
        <FormTextField control={control} name={FIRST_NAME.name} placeholder={FIRST_NAME.placeholder} />
      </FormFieldWrapper>
      <FormFieldWrapper>
        <InputLabel>{LAST_NAME.placeholder}</InputLabel>
        <FormTextField control={control} name={LAST_NAME.name} placeholder={LAST_NAME.placeholder} />
      </FormFieldWrapper>
      <FormFieldWrapper>
        <InputLabel>{FULL_NAME.placeholder}</InputLabel>
        <FormTextField control={control} name={FULL_NAME.name} placeholder={FULL_NAME.placeholder} />
      </FormFieldWrapper>
      <FormFieldWrapper>
        <InputLabel>{ORCID.placeholder}</InputLabel>
        <FormTextField control={control} name={ORCID.name} placeholder={ORCID.placeholder} />
      </FormFieldWrapper>
      <FormFieldWrapper>
        <InputLabel>{WEBSITE_URL.placeholder}</InputLabel>
        <FormTextField control={control} name={WEBSITE_URL.name} placeholder={WEBSITE_URL.placeholder} />
      </FormFieldWrapper>
      <Button variant="contained" type="submit" className="self-start">
        {isNew ? 'Create' : 'Update'}
      </Button>
    </form>
  );
};

export default EditContributorForm;
