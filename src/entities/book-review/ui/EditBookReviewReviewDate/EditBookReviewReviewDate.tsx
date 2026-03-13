'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { bookReviewReviewDateValidationSchema } from '../../model/book-review.validation';

const { BOOK_REVIEW_REVIEW_DATE } = FORM_FIELDS;
const { BOOK_REVIEW_REVIEW_DATE: BOOK_REVIEW_REVIEW_DATE_HELPER_TEXT } = HELPER_TEXT;

type EditBookReviewReviewDateProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

// TODO: update field to date field
export const EditBookReviewReviewDate = (props: EditBookReviewReviewDateProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.BOOK_REVIEW_REVIEW_DATE}
      borderTransparent
      isTableVariant
      validationSchema={bookReviewReviewDateValidationSchema}
      defaultValues={{ [BOOK_REVIEW_REVIEW_DATE.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.reviewDate)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={BOOK_REVIEW_REVIEW_DATE.label} id={BOOK_REVIEW_REVIEW_DATE.name} />
          <FormTextField
            control={control}
            name={BOOK_REVIEW_REVIEW_DATE.name}
            id={BOOK_REVIEW_REVIEW_DATE.name}
            helperText={BOOK_REVIEW_REVIEW_DATE_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={BOOK_REVIEW_REVIEW_DATE.label}
          value={data?.reviewDate}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
