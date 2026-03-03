'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { prettifyUrlPreview } from '@/src/shared/utils';

import { referenceValidationSchema } from '../../model/reference.validation';

const { REFERENCE_URL } = FORM_FIELDS;
const { REFERENCE_URL: REFERENCE_URL_HELPER_TEXT } = HELPER_TEXT;

type EditReferenceUrlProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditReferenceUrl = (props: EditReferenceUrlProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.REFERENCE_URL}
      borderTransparent
      isTableVariant
      validationSchema={referenceValidationSchema}
      defaultValues={{ [REFERENCE_URL.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.url)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={REFERENCE_URL.label} id={REFERENCE_URL.name} />
          <FormTextField
            control={control}
            name={REFERENCE_URL.name}
            id={REFERENCE_URL.name}
            helperText={REFERENCE_URL_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            isUrlField
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={REFERENCE_URL.label}
          value={prettifyUrlPreview(data?.url)}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
