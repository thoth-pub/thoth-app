'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { awardJuryValidationSchema } from '../../model/award.validation';

const { AWARD_JURY } = FORM_FIELDS;
const { AWARD_JURY: AWARD_JURY_HELPER_TEXT } = HELPER_TEXT;

type EditAwardJuryProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditAwardJury = (props: EditAwardJuryProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.AWARD_JURY}
      borderTransparent
      isTableVariant
      validationSchema={awardJuryValidationSchema}
      defaultValues={{ [AWARD_JURY.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.jury)}
      faq={AWARD_JURY_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={AWARD_JURY.label} id={AWARD_JURY.name} />
          <FormTextField control={control} name={AWARD_JURY.name} id={AWARD_JURY.name} />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={AWARD_JURY.label} value={data?.jury} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
