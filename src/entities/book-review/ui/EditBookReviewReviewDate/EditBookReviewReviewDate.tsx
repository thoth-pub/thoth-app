import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { DateField, FormFieldLabel, FormHelperText, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { convertDateToFormattedDate } from '@/src/shared/utils';

import type { BookReviewReviewDateForm } from '../../model/book-review.types';
import { bookReviewReviewDateValidationSchema } from '../../model/book-review.validation';

const { BOOK_REVIEW_REVIEW_DATE } = FORM_FIELDS;
const { BOOK_REVIEW_REVIEW_DATE: BOOK_REVIEW_REVIEW_DATE_HELPER_TEXT } = HELPER_TEXT;

type EditBookReviewReviewDateProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditBookReviewReviewDate = (props: EditBookReviewReviewDateProps) => {
  const { defaultValue = '', onUpdate } = props;

  const onSubmit = (data: BookReviewReviewDateForm) => {
    onUpdate?.(data.reviewDate ? convertDateToFormattedDate(`${data.reviewDate}`) : '');
  };

  return (
    <EditableContent
      formId={IDs.BOOK_REVIEW_REVIEW_DATE}
      borderTransparent
      isTableVariant
      validationSchema={bookReviewReviewDateValidationSchema}
      defaultValues={{ [BOOK_REVIEW_REVIEW_DATE.name]: defaultValue }}
      onSubmit={onSubmit}
      formFields={({ control, isHelperTextVisible }) => (
        <>
          <FormFieldLabel label={BOOK_REVIEW_REVIEW_DATE.label} id={BOOK_REVIEW_REVIEW_DATE.name} />
          <DateField
            control={control}
            name={BOOK_REVIEW_REVIEW_DATE.name}
            slotProps={{ field: { id: BOOK_REVIEW_REVIEW_DATE.name } }}
            className="h-10"
            sx={{ width: '100%' }}
          />
          {isHelperTextVisible && <FormHelperText>{BOOK_REVIEW_REVIEW_DATE_HELPER_TEXT}</FormHelperText>}
        </>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={BOOK_REVIEW_REVIEW_DATE.label}
          value={data?.reviewDate ? convertDateToFormattedDate(`${data.reviewDate}`) : ''}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
