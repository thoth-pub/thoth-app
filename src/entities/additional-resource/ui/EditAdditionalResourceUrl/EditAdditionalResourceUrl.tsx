'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { prettifyUrlPreview } from '@/src/shared/utils';

import { additionalResourceUrlValidationSchema } from '../../model/additional-resource.validation';

const { ADDITIONAL_RESOURCE_URL } = FORM_FIELDS;
const { ADDITIONAL_RESOURCE_URL: ADDITIONAL_RESOURCE_URL_HELPER_TEXT } = HELPER_TEXT;

type EditAdditionalResourceUrlProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditAdditionalResourceUrl = (props: EditAdditionalResourceUrlProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.ADDITIONAL_RESOURCE_URL}
      borderTransparent
      isTableVariant
      validationSchema={additionalResourceUrlValidationSchema}
      defaultValues={{ [ADDITIONAL_RESOURCE_URL.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.url)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={ADDITIONAL_RESOURCE_URL.label} id={ADDITIONAL_RESOURCE_URL.name} />
          <FormTextField
            control={control}
            name={ADDITIONAL_RESOURCE_URL.name}
            id={ADDITIONAL_RESOURCE_URL.name}
            helperText={ADDITIONAL_RESOURCE_URL_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            isUrlField
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={ADDITIONAL_RESOURCE_URL.label}
          value={prettifyUrlPreview(data?.url)}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
