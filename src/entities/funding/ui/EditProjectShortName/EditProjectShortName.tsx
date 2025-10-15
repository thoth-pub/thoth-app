'use client';

import { HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { FundingProjectShortNameFormType } from '../../model/funding.types';
import { projectShortNameValidationSchema } from '../../model/funding.validation';

const { PROJECT_SHORTNAME } = FORM_FIELDS;

const { PROJECT_SHORTNAME: PROJECT_SHORTNAME_HELPER_TEXT } = HELPER_TEXT;

type EditProjectShortNameFormProps = {
  defaultValue?: string;
  onUpdate?: (data: FundingProjectShortNameFormType) => void;
};

const EditProjectShortNameForm = (props: EditProjectShortNameFormProps) => {
  const { defaultValue, onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.FUNDING_PROJECT_SHORTNAME}
      borderTransparent
      isTableVariant
      validationSchema={projectShortNameValidationSchema}
      defaultValues={{ [PROJECT_SHORTNAME.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={PROJECT_SHORTNAME.label} id={PROJECT_SHORTNAME.name} />
          <FormTextField
            control={control}
            name={PROJECT_SHORTNAME.name}
            id={PROJECT_SHORTNAME.name}
            helperText={PROJECT_SHORTNAME_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, onEdit }) => (
        <Preview label={PROJECT_SHORTNAME.label} value={data?.projectShortname} onEdit={onEdit} />
      )}
    />
  );
};

export default EditProjectShortNameForm;
