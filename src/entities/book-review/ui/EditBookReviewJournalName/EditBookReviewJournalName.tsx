'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { bookReviewJournalNameValidationSchema } from '../../model/book-review.validation';

const { BOOK_REVIEW_JOURNAL_NAME } = FORM_FIELDS;
const { BOOK_REVIEW_JOURNAL_NAME: BOOK_REVIEW_JOURNAL_NAME_HELPER_TEXT } = HELPER_TEXT;

type EditBookReviewJournalNameProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditBookReviewJournalName = (props: EditBookReviewJournalNameProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.BOOK_REVIEW_JOURNAL_NAME}
      borderTransparent
      isTableVariant
      validationSchema={bookReviewJournalNameValidationSchema}
      defaultValues={{ [BOOK_REVIEW_JOURNAL_NAME.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.journalName)}
      faq={BOOK_REVIEW_JOURNAL_NAME_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={BOOK_REVIEW_JOURNAL_NAME.label} id={BOOK_REVIEW_JOURNAL_NAME.name} />
          <FormTextField control={control} name={BOOK_REVIEW_JOURNAL_NAME.name} id={BOOK_REVIEW_JOURNAL_NAME.name} />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={BOOK_REVIEW_JOURNAL_NAME.label} value={data?.journalName} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
