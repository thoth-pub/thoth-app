'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { bookReviewPageRangeValidationSchema } from '../../model/book-review.validation';

const { BOOK_REVIEW_PAGE_RANGE } = FORM_FIELDS;
const { BOOK_REVIEW_PAGE_RANGE: BOOK_REVIEW_PAGE_RANGE_HELPER_TEXT } = HELPER_TEXT;

type EditBookReviewPageRangeProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditBookReviewPageRange = (props: EditBookReviewPageRangeProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.BOOK_REVIEW_PAGE_RANGE}
      borderTransparent
      isTableVariant
      validationSchema={bookReviewPageRangeValidationSchema}
      defaultValues={{ [BOOK_REVIEW_PAGE_RANGE.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.pageRange)}
      faq={BOOK_REVIEW_PAGE_RANGE_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={BOOK_REVIEW_PAGE_RANGE.label} id={BOOK_REVIEW_PAGE_RANGE.name} />
          <FormTextField control={control} name={BOOK_REVIEW_PAGE_RANGE.name} id={BOOK_REVIEW_PAGE_RANGE.name} />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={BOOK_REVIEW_PAGE_RANGE.label} value={data?.pageRange} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
