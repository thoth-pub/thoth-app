'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, MarkdownField, MarkdownPreview, Preview, Typography } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { bookReviewTitleValidationSchema } from '../../model/book-review.validation';

const { BOOK_REVIEW_TITLE } = FORM_FIELDS;
const { BOOK_REVIEW_TITLE: BOOK_REVIEW_TITLE_HELPER_TEXT } = HELPER_TEXT;

type EditBookReviewTitleProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditBookReviewTitle = (props: EditBookReviewTitleProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.BOOK_REVIEW_TITLE}
      borderTransparent
      isTableVariant
      validationSchema={bookReviewTitleValidationSchema}
      defaultValues={{ [BOOK_REVIEW_TITLE.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.title)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={BOOK_REVIEW_TITLE.label} id={BOOK_REVIEW_TITLE.name} />
          <MarkdownField
            control={control}
            name={BOOK_REVIEW_TITLE.name}
            id={BOOK_REVIEW_TITLE.name}
            helperText={BOOK_REVIEW_TITLE_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            disableLineBreaks
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={BOOK_REVIEW_TITLE.label} value={data?.title} disabled={disabled} onEdit={onEdit}>
          <Typography component="span">
            <MarkdownPreview source={data?.title} />
          </Typography>
        </Preview>
      )}
    />
  );
};
