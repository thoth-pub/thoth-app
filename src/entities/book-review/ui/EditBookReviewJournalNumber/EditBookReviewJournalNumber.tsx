'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { bookReviewJournalNumberValidationSchema } from '../../model/book-review.validation';

const { BOOK_REVIEW_JOURNAL_NUMBER } = FORM_FIELDS;
const { BOOK_REVIEW_JOURNAL_NUMBER: BOOK_REVIEW_JOURNAL_NUMBER_HELPER_TEXT } = HELPER_TEXT;

type EditBookReviewJournalNumberProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditBookReviewJournalNumber = (props: EditBookReviewJournalNumberProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.BOOK_REVIEW_JOURNAL_NUMBER}
      borderTransparent
      isTableVariant
      validationSchema={bookReviewJournalNumberValidationSchema}
      defaultValues={{ [BOOK_REVIEW_JOURNAL_NUMBER.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.journalNumber)}
      faq={BOOK_REVIEW_JOURNAL_NUMBER_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={BOOK_REVIEW_JOURNAL_NUMBER.label} id={BOOK_REVIEW_JOURNAL_NUMBER.name} />
          <FormTextField
            control={control}
            name={BOOK_REVIEW_JOURNAL_NUMBER.name}
            id={BOOK_REVIEW_JOURNAL_NUMBER.name}
            type={BOOK_REVIEW_JOURNAL_NUMBER.type}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={BOOK_REVIEW_JOURNAL_NUMBER.label}
          value={data?.journalNumber}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
