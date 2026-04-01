'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { additionalResourceAttributionValidationSchema } from '../../model/additional-resource.validation';

const { ADDITIONAL_RESOURCE_ATTRIBUTION } = FORM_FIELDS;
const { ADDITIONAL_RESOURCE_ATTRIBUTION: ADDITIONAL_RESOURCE_ATTRIBUTION_HELPER_TEXT } = HELPER_TEXT;

type EditAdditionalResourceAttributionProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditAdditionalResourceAttribution = (props: EditAdditionalResourceAttributionProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.ADDITIONAL_RESOURCE_ATTRIBUTION}
      borderTransparent
      isTableVariant
      validationSchema={additionalResourceAttributionValidationSchema}
      defaultValues={{ [ADDITIONAL_RESOURCE_ATTRIBUTION.name]: defaultValue }}
      faq={ADDITIONAL_RESOURCE_ATTRIBUTION_HELPER_TEXT}
      onSubmit={(data) => onUpdate?.(data.attribution)}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={ADDITIONAL_RESOURCE_ATTRIBUTION.label} id={ADDITIONAL_RESOURCE_ATTRIBUTION.name} />
          <FormTextField
            control={control}
            name={ADDITIONAL_RESOURCE_ATTRIBUTION.name}
            id={ADDITIONAL_RESOURCE_ATTRIBUTION.name}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={ADDITIONAL_RESOURCE_ATTRIBUTION.label}
          value={data?.attribution}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
