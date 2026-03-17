'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, MarkdownField, MarkdownPreview, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { additionalResourceDescriptionValidationSchema } from '../../model/additional-resource.validation';

const { ADDITIONAL_RESOURCE_DESCRIPTION } = FORM_FIELDS;
const { ADDITIONAL_RESOURCE_DESCRIPTION: ADDITIONAL_RESOURCE_DESCRIPTION_HELPER_TEXT } = HELPER_TEXT;

type EditAdditionalResourceDescriptionProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditAdditionalResourceDescription = (props: EditAdditionalResourceDescriptionProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.ADDITIONAL_RESOURCE_DESCRIPTION}
      borderTransparent
      isTableVariant
      validationSchema={additionalResourceDescriptionValidationSchema}
      defaultValues={{ [ADDITIONAL_RESOURCE_DESCRIPTION.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.description)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={ADDITIONAL_RESOURCE_DESCRIPTION.label} id={ADDITIONAL_RESOURCE_DESCRIPTION.name} />
          <MarkdownField
            control={control}
            name={ADDITIONAL_RESOURCE_DESCRIPTION.name}
            id={ADDITIONAL_RESOURCE_DESCRIPTION.name}
            helperText={ADDITIONAL_RESOURCE_DESCRIPTION_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            disableLineBreaks
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={ADDITIONAL_RESOURCE_DESCRIPTION.label} value={data?.description} disabled={disabled} onEdit={onEdit}>
          <Typography component="span">
            <MarkdownPreview source={data?.description} />
          </Typography>
        </Preview>
      )}
    />
  );
};
