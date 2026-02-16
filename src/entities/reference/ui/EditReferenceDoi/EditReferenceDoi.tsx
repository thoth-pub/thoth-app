'use client';

import { HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, DoiPreview, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { doiValidationSchema } from '../../model/reference.validation';

const { REFERENCE_DOI } = FORM_FIELDS;
const { REFERENCE_DOI: REFERENCE_DOI_HELPER_TEXT } = HELPER_TEXT;

type EditReferenceDoiProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditReferenceDoi = (props: EditReferenceDoiProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.REFERENCE_DOI}
      borderTransparent
      isTableVariant
      validationSchema={doiValidationSchema}
      defaultValues={{ [REFERENCE_DOI.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.doi)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={REFERENCE_DOI.label} id={REFERENCE_DOI.name} />
          <FormTextField
            control={control}
            name={REFERENCE_DOI.name}
            id={REFERENCE_DOI.name}
            helperText={REFERENCE_DOI_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            isDoiField
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={REFERENCE_DOI.label} value={data?.doi} disabled={disabled} onEdit={onEdit}>
          {data?.doi && data?.doi.length > 0 && <DoiPreview doi={data.doi} className="ml-2" />}
        </Preview>
      )}
    />
  );
};
