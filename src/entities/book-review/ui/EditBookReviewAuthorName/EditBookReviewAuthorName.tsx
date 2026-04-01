'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { bookReviewAuthorNameValidationSchema } from '../../model/book-review.validation';

const { BOOK_REVIEW_AUTHOR_NAME } = FORM_FIELDS;
const { BOOK_REVIEW_AUTHOR_NAME: BOOK_REVIEW_AUTHOR_NAME_HELPER_TEXT } = HELPER_TEXT;

type EditBookReviewAuthorNameProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditBookReviewAuthorName = (props: EditBookReviewAuthorNameProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.BOOK_REVIEW_AUTHOR_NAME}
      borderTransparent
      isTableVariant
      validationSchema={bookReviewAuthorNameValidationSchema}
      defaultValues={{ [BOOK_REVIEW_AUTHOR_NAME.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.authorName)}
      faq={BOOK_REVIEW_AUTHOR_NAME_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={BOOK_REVIEW_AUTHOR_NAME.label} id={BOOK_REVIEW_AUTHOR_NAME.name} />
          <FormTextField control={control} name={BOOK_REVIEW_AUTHOR_NAME.name} id={BOOK_REVIEW_AUTHOR_NAME.name} />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={BOOK_REVIEW_AUTHOR_NAME.label} value={data?.authorName} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
