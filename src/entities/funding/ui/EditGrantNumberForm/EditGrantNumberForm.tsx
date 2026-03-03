'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { FundingGrantNumberFormType } from '../../model/funding.types';
import { grantNumberValidationSchema } from '../../model/funding.validation';

const { GRANT_NUMBER } = FORM_FIELDS;

const { GRANT_NUMBER: GRANT_NUMBER_HELPER_TEXT } = HELPER_TEXT;

type EditGrantNumberFormProps = {
  defaultValue?: string;
  recommended?: boolean;
  onUpdate?: (data: FundingGrantNumberFormType) => void;
};

const EditGrantNumberForm = (props: EditGrantNumberFormProps) => {
  const { defaultValue = '', recommended = false, onUpdate } = props;

  const showIndicator = recommended && defaultValue.length === 0;

  return (
    <EditableContent
      formId={IDs.FUNDING_GRANT_NUMBER}
      borderTransparent
      isTableVariant
      validationSchema={grantNumberValidationSchema}
      defaultValues={{ [GRANT_NUMBER.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={GRANT_NUMBER.label} id={GRANT_NUMBER.name} recommended={showIndicator} />
          <FormTextField
            control={control}
            name={GRANT_NUMBER.name}
            id={GRANT_NUMBER.name}
            helperText={GRANT_NUMBER_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={GRANT_NUMBER.label}
          value={data?.grantNumber}
          recommended={showIndicator}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditGrantNumberForm;
