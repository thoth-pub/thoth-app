'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { convertOrchidIdToText } from '@/src/shared/utils';

import { bookReviewReviewerOrcidValidationSchema } from '../../model/book-review.validation';

const { BOOK_REVIEW_REVIEWER_ORCID } = FORM_FIELDS;
const { BOOK_REVIEW_REVIEWER_ORCID: BOOK_REVIEW_REVIEWER_ORCID_HELPER_TEXT } = HELPER_TEXT;

type EditBookReviewReviewerOrcidProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditBookReviewReviewerOrcid = (props: EditBookReviewReviewerOrcidProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.BOOK_REVIEW_REVIEWER_ORCID}
      borderTransparent
      isTableVariant
      validationSchema={bookReviewReviewerOrcidValidationSchema}
      defaultValues={{ [BOOK_REVIEW_REVIEWER_ORCID.name]: defaultValue }}
      faq={BOOK_REVIEW_REVIEWER_ORCID_HELPER_TEXT}
      onSubmit={(data) => onUpdate?.(data.reviewerOrcid)}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={BOOK_REVIEW_REVIEWER_ORCID.label} id={BOOK_REVIEW_REVIEWER_ORCID.name} />
          <FormTextField
            control={control}
            name={BOOK_REVIEW_REVIEWER_ORCID.name}
            id={BOOK_REVIEW_REVIEWER_ORCID.name}
            isOrcidField
          />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={BOOK_REVIEW_REVIEWER_ORCID.label}
          value={defaultValue ? convertOrchidIdToText(defaultValue) : ''}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
