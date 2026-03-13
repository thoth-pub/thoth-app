'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { awardNoteValidationSchema } from '../../model/award.validation';

const { AWARD_NOTE } = FORM_FIELDS;
const { AWARD_NOTE: AWARD_NOTE_HELPER_TEXT } = HELPER_TEXT;

type EditAwardNoteProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditAwardNote = (props: EditAwardNoteProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.AWARD_NOTE}
      borderTransparent
      isTableVariant
      validationSchema={awardNoteValidationSchema}
      defaultValues={{ [AWARD_NOTE.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.note)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={AWARD_NOTE.label} id={AWARD_NOTE.name} />
          <FormTextField
            control={control}
            name={AWARD_NOTE.name}
            id={AWARD_NOTE.name}
            helperText={AWARD_NOTE_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={AWARD_NOTE.label} value={data?.note} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
