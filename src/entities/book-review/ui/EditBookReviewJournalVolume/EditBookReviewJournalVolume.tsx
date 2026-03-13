'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { bookReviewJournalVolumeValidationSchema } from '../../model/book-review.validation';

const { BOOK_REVIEW_JOURNAL_VOLUME } = FORM_FIELDS;
const { BOOK_REVIEW_JOURNAL_VOLUME: BOOK_REVIEW_JOURNAL_VOLUME_HELPER_TEXT } = HELPER_TEXT;

type EditBookReviewJournalVolumeProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditBookReviewJournalVolume = (props: EditBookReviewJournalVolumeProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.BOOK_REVIEW_JOURNAL_VOLUME}
      borderTransparent
      isTableVariant
      validationSchema={bookReviewJournalVolumeValidationSchema}
      defaultValues={{ [BOOK_REVIEW_JOURNAL_VOLUME.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.journalVolume)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={BOOK_REVIEW_JOURNAL_VOLUME.label} id={BOOK_REVIEW_JOURNAL_VOLUME.name} />
          <FormTextField
            control={control}
            name={BOOK_REVIEW_JOURNAL_VOLUME.name}
            id={BOOK_REVIEW_JOURNAL_VOLUME.name}
            helperText={BOOK_REVIEW_JOURNAL_VOLUME_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            type={BOOK_REVIEW_JOURNAL_VOLUME.type}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={BOOK_REVIEW_JOURNAL_VOLUME.label}
          value={data?.journalVolume}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
