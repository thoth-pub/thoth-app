'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, MarkdownField, MarkdownPreview, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { awardTitleValidationSchema } from '../../model/award.validation';

const { AWARD_TITLE } = FORM_FIELDS;
const { AWARD_TITLE: AWARD_TITLE_HELPER_TEXT } = HELPER_TEXT;

type EditAwardTitleProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditAwardTitle = (props: EditAwardTitleProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.AWARD_TITLE}
      borderTransparent
      isTableVariant
      validationSchema={awardTitleValidationSchema}
      defaultValues={{ [AWARD_TITLE.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.title)}
      faq={AWARD_TITLE_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={AWARD_TITLE.label} id={AWARD_TITLE.name} />
          <MarkdownField control={control} name={AWARD_TITLE.name} id={AWARD_TITLE.name} disableLineBreaks />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={AWARD_TITLE.label} value={data?.title} disabled={disabled} onEdit={onEdit}>
          <Typography component="span">
            <MarkdownPreview source={data?.title} />
          </Typography>
        </Preview>
      )}
    />
  );
};
