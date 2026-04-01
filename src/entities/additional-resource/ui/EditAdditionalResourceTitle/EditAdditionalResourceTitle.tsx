'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, MarkdownField, MarkdownPreview, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { additionalResourceTitleValidationSchema } from '../../model/additional-resource.validation';

const { ADDITIONAL_RESOURCE_TITLE } = FORM_FIELDS;
const { ADDITIONAL_RESOURCE_TITLE: ADDITIONAL_RESOURCE_TITLE_HELPER_TEXT } = HELPER_TEXT;

type EditAdditionalResourceTitleProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditAdditionalResourceTitle = (props: EditAdditionalResourceTitleProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.ADDITIONAL_RESOURCE_TITLE}
      borderTransparent
      isTableVariant
      validationSchema={additionalResourceTitleValidationSchema}
      defaultValues={{ [ADDITIONAL_RESOURCE_TITLE.name]: defaultValue }}
      faq={ADDITIONAL_RESOURCE_TITLE_HELPER_TEXT}
      onSubmit={(data) => onUpdate?.(data.title)}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={ADDITIONAL_RESOURCE_TITLE.label} id={ADDITIONAL_RESOURCE_TITLE.name} />
          <MarkdownField
            control={control}
            name={ADDITIONAL_RESOURCE_TITLE.name}
            id={ADDITIONAL_RESOURCE_TITLE.name}
            disableLineBreaks
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={ADDITIONAL_RESOURCE_TITLE.label} value={data?.title} disabled={disabled} onEdit={onEdit}>
          <Typography component="span">
            <MarkdownPreview source={data?.title} />
          </Typography>
        </Preview>
      )}
    />
  );
};
