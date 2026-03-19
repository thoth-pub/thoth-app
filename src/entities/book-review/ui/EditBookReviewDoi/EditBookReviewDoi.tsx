'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { prettifyUrlPreview } from '@/src/shared/utils';

import { bookReviewDoiValidationSchema } from '../../model/book-review.validation';

const { DOI } = FORM_FIELDS;
const { DOI: DOI_HELPER_TEXT } = HELPER_TEXT;

type EditBookReviewDoiProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditBookReviewDoi = (props: EditBookReviewDoiProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.BOOK_REVIEW_DOI}
      borderTransparent
      isTableVariant
      validationSchema={bookReviewDoiValidationSchema}
      defaultValues={{ [DOI.name]: defaultValue }}
      faq={DOI_HELPER_TEXT}
      onSubmit={(data) => onUpdate?.(data.doi)}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={DOI.label} id={DOI.name} />
          <FormTextField control={control} name={DOI.name} id={DOI.name} isDoiField />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={DOI.label} value={prettifyUrlPreview(data?.doi)} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
