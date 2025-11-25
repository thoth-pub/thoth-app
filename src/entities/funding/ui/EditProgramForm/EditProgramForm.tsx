'use client';

import { HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { FundingProgramFormType } from '../../model/funding.types';
import { programValidationSchema } from '../../model/funding.validation';

const { PROGRAM } = FORM_FIELDS;

const { PROGRAM: PROGRAM_HELPER_TEXT } = HELPER_TEXT;

type EditProgramFormProps = {
  defaultValue?: string;
  onUpdate?: (data: FundingProgramFormType) => void;
};

const EditProgramForm = (props: EditProgramFormProps) => {
  const { defaultValue, onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.FUNDING_PROGRAM}
      borderTransparent
      isTableVariant
      validationSchema={programValidationSchema}
      defaultValues={{ [PROGRAM.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={PROGRAM.label} id={PROGRAM.name} />
          <FormTextField
            control={control}
            name={PROGRAM.name}
            id={PROGRAM.name}
            helperText={PROGRAM_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={PROGRAM.label} value={data?.program} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};

export default EditProgramForm;
