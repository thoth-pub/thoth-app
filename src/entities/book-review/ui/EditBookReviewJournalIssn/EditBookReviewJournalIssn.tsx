'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { bookReviewJournalIssnValidationSchema } from '../../model/book-review.validation';

const { BOOK_REVIEW_JOURNAL_ISSN } = FORM_FIELDS;
const { BOOK_REVIEW_JOURNAL_ISSN: BOOK_REVIEW_JOURNAL_ISSN_HELPER_TEXT } = HELPER_TEXT;

type EditBookReviewJournalIssnProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditBookReviewJournalIssn = (props: EditBookReviewJournalIssnProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.BOOK_REVIEW_JOURNAL_ISSN}
      borderTransparent
      isTableVariant
      validationSchema={bookReviewJournalIssnValidationSchema}
      defaultValues={{ [BOOK_REVIEW_JOURNAL_ISSN.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.journalIssn)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={BOOK_REVIEW_JOURNAL_ISSN.label} id={BOOK_REVIEW_JOURNAL_ISSN.name} />
          <FormTextField
            control={control}
            name={BOOK_REVIEW_JOURNAL_ISSN.name}
            id={BOOK_REVIEW_JOURNAL_ISSN.name}
            helperText={BOOK_REVIEW_JOURNAL_ISSN_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={BOOK_REVIEW_JOURNAL_ISSN.label}
          value={data?.journalIssn}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
