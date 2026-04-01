'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { additionalResourceHandleValidationSchema } from '../../model/additional-resource.validation';

const { ADDITIONAL_RESOURCE_HANDLE } = FORM_FIELDS;
const { ADDITIONAL_RESOURCE_HANDLE: ADDITIONAL_RESOURCE_HANDLE_HELPER_TEXT } = HELPER_TEXT;

type EditAdditionalResourceHandleProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditAdditionalResourceHandle = (props: EditAdditionalResourceHandleProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.ADDITIONAL_RESOURCE_HANDLE}
      borderTransparent
      isTableVariant
      validationSchema={additionalResourceHandleValidationSchema}
      defaultValues={{ [ADDITIONAL_RESOURCE_HANDLE.name]: defaultValue }}
      faq={ADDITIONAL_RESOURCE_HANDLE_HELPER_TEXT}
      onSubmit={(data) => onUpdate?.(data.handle)}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={ADDITIONAL_RESOURCE_HANDLE.label} id={ADDITIONAL_RESOURCE_HANDLE.name} />
          <FormTextField
            control={control}
            name={ADDITIONAL_RESOURCE_HANDLE.name}
            id={ADDITIONAL_RESOURCE_HANDLE.name}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={ADDITIONAL_RESOURCE_HANDLE.label} value={data?.handle} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
