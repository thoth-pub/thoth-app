'use client';

import { HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { FundingJurisdictionFormType } from '../../model/funding.types';
import { jurisdictionValidationSchema } from '../../model/funding.validation';

const { JURISDICTION } = FORM_FIELDS;

const { JURISDICTION: JURISDICTION_HELPER_TEXT } = HELPER_TEXT;

type EditJurisdictionFormProps = {
  defaultValue?: string;
  onUpdate?: (data: FundingJurisdictionFormType) => void;
};

const EditJurisdictionForm = (props: EditJurisdictionFormProps) => {
  const { defaultValue, onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.FUNDING_JURISDICTION}
      borderTransparent
      isTableVariant
      validationSchema={jurisdictionValidationSchema}
      defaultValues={{ [JURISDICTION.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={JURISDICTION.label} id={JURISDICTION.name} />
          <FormTextField
            control={control}
            name={JURISDICTION.name}
            id={JURISDICTION.name}
            helperText={JURISDICTION_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, onEdit }) => <Preview label={JURISDICTION.label} value={data?.jurisdiction} onEdit={onEdit} />}
    />
  );
};

export default EditJurisdictionForm;
