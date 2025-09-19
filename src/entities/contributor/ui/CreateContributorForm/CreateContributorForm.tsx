'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { Button, FormFieldWrapper, FormTextField, InputLabel } from '@/src/shared/ui';

import { type ContributorForm, contributorFormValidationSchema } from '../../model/contributor.validation';

const { FIRST_NAME, LAST_NAME, ORCID, WEBSITE_URL } = FORM_FIELDS;

type CreateContributorFormProps = {
  onSubmit: (data: ContributorForm) => void;
};

const CreateContributorForm = ({ onSubmit }: CreateContributorFormProps) => {
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(contributorFormValidationSchema),
    mode: 'onChange',
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
        <InputLabel>{ORCID.placeholder}</InputLabel>
        <FormTextField control={control} name={ORCID.name} placeholder={ORCID.placeholder} />
      </FormFieldWrapper>
      <FormFieldWrapper>
        <InputLabel>{WEBSITE_URL.placeholder}</InputLabel>
        <FormTextField control={control} name={WEBSITE_URL.name} placeholder={WEBSITE_URL.placeholder} />
      </FormFieldWrapper>
      <Button variant="contained" type="submit" className="self-start">
        Create
      </Button>
    </form>
  );
};

export default CreateContributorForm;
