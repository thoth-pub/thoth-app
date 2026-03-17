'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, MarkdownField, MarkdownPreview, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { bookReviewTextValidationSchema } from '../../model/book-review.validation';

const { BOOK_REVIEW_TEXT } = FORM_FIELDS;
const { BOOK_REVIEW_TEXT: BOOK_REVIEW_TEXT_HELPER_TEXT } = HELPER_TEXT;

type EditBookReviewTextProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditBookReviewText = (props: EditBookReviewTextProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.BOOK_REVIEW_TEXT}
      borderTransparent
      isTableVariant
      validationSchema={bookReviewTextValidationSchema}
      defaultValues={{ [BOOK_REVIEW_TEXT.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.text)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={BOOK_REVIEW_TEXT.label} id={BOOK_REVIEW_TEXT.name} />
          <MarkdownField
            control={control}
            name={BOOK_REVIEW_TEXT.name}
            id={BOOK_REVIEW_TEXT.name}
            helperText={BOOK_REVIEW_TEXT_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            disableLineBreaks
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={BOOK_REVIEW_TEXT.label} value={data?.text} disabled={disabled} onEdit={onEdit}>
          <Typography component="span">
            <MarkdownPreview source={data?.text} />
          </Typography>
        </Preview>
      )}
    />
  );
};
