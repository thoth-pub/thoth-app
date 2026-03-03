'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { FundingProjectNameFormType } from '../../model/funding.types';
import { projectNameValidationSchema } from '../../model/funding.validation';

const { PROJECT_NAME } = FORM_FIELDS;

const { PROJECT_NAME: PROJECT_NAME_HELPER_TEXT } = HELPER_TEXT;

type EditProjectNameFormProps = {
  defaultValue?: string;
  onUpdate?: (data: FundingProjectNameFormType) => void;
};

const EditProjectNameForm = (props: EditProjectNameFormProps) => {
  const { defaultValue, onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.FUNDING_PROJECT_NAME}
      borderTransparent
      isTableVariant
      validationSchema={projectNameValidationSchema}
      defaultValues={{ [PROJECT_NAME.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={PROJECT_NAME.label} id={PROJECT_NAME.name} />
          <FormTextField
            control={control}
            name={PROJECT_NAME.name}
            id={PROJECT_NAME.name}
            helperText={PROJECT_NAME_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={PROJECT_NAME.label} value={data?.projectName} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};

export default EditProjectNameForm;
