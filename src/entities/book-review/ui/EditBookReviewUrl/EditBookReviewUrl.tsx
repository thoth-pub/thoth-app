'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { prettifyUrlPreview } from '@/src/shared/utils';

import { bookReviewUrlValidationSchema } from '../../model/book-review.validation';

const { BOOK_REVIEW_URL } = FORM_FIELDS;
const { BOOK_REVIEW_URL: BOOK_REVIEW_URL_HELPER_TEXT } = HELPER_TEXT;

type EditBookReviewUrlProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditBookReviewUrl = (props: EditBookReviewUrlProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.BOOK_REVIEW_URL}
      borderTransparent
      isTableVariant
      validationSchema={bookReviewUrlValidationSchema}
      defaultValues={{ [BOOK_REVIEW_URL.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.url)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={BOOK_REVIEW_URL.label} id={BOOK_REVIEW_URL.name} />
          <FormTextField
            control={control}
            name={BOOK_REVIEW_URL.name}
            id={BOOK_REVIEW_URL.name}
            helperText={BOOK_REVIEW_URL_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            isUrlField
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={BOOK_REVIEW_URL.label}
          value={prettifyUrlPreview(data?.url)}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
