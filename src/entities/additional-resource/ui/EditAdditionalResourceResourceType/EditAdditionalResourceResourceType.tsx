'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { convertOptionToString, resourceTypeOptions } from '@/src/shared/utils';

import { additionalResourceResourceTypeValidationSchema } from '../../model/additional-resource.validation';

const { ADDITIONAL_RESOURCE_RESOURCE_TYPE } = FORM_FIELDS;
const { ADDITIONAL_RESOURCE_RESOURCE_TYPE: ADDITIONAL_RESOURCE_RESOURCE_TYPE_HELPER_TEXT } = HELPER_TEXT;

type EditAdditionalResourceResourceTypeProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditAdditionalResourceResourceType = (props: EditAdditionalResourceResourceTypeProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.ADDITIONAL_RESOURCE_RESOURCE_TYPE}
      borderTransparent
      isTableVariant
      validationSchema={additionalResourceResourceTypeValidationSchema}
      defaultValues={{ [ADDITIONAL_RESOURCE_RESOURCE_TYPE.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.resourceType)}
      faq={ADDITIONAL_RESOURCE_RESOURCE_TYPE_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={ADDITIONAL_RESOURCE_RESOURCE_TYPE.label} id={ADDITIONAL_RESOURCE_RESOURCE_TYPE.name} />
          <FormTextField
            control={control}
            name={ADDITIONAL_RESOURCE_RESOURCE_TYPE.name}
            id={ADDITIONAL_RESOURCE_RESOURCE_TYPE.name}
            select
            options={resourceTypeOptions}
            translateOptions
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={ADDITIONAL_RESOURCE_RESOURCE_TYPE.label}
          value={convertOptionToString(data?.resourceType ?? '')}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
