'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { endorsementTextValidationSchema } from '../../model/endorsement.validation';

const { ENDORSEMENT_TEXT } = FORM_FIELDS;
const { ENDORSEMENT_TEXT: ENDORSEMENT_TEXT_HELPER_TEXT } = HELPER_TEXT;

type EditEndorsementTextProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditEndorsementText = (props: EditEndorsementTextProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.ENDORSEMENT_TEXT}
      borderTransparent
      isTableVariant
      validationSchema={endorsementTextValidationSchema}
      defaultValues={{ [ENDORSEMENT_TEXT.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.text)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={ENDORSEMENT_TEXT.label} id={ENDORSEMENT_TEXT.name} />
          <FormTextField
            control={control}
            name={ENDORSEMENT_TEXT.name}
            id={ENDORSEMENT_TEXT.name}
            helperText={ENDORSEMENT_TEXT_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={ENDORSEMENT_TEXT.label} value={data?.text} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
