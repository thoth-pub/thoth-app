'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { awardYearValidationSchema } from '../../model/award.validation';

const { AWARD_YEAR } = FORM_FIELDS;
const { AWARD_YEAR: AWARD_YEAR_HELPER_TEXT } = HELPER_TEXT;

type EditAwardYearProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditAwardYear = (props: EditAwardYearProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.AWARD_YEAR}
      borderTransparent
      isTableVariant
      validationSchema={awardYearValidationSchema}
      defaultValues={{ [AWARD_YEAR.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.year)}
      faq={AWARD_YEAR_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={AWARD_YEAR.label} id={AWARD_YEAR.name} />
          <FormTextField control={control} name={AWARD_YEAR.name} id={AWARD_YEAR.name} />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={AWARD_YEAR.label} value={data?.year} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
