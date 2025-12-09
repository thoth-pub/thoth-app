'use client';

import { HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, DoiPreview, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { doiValidationSchema } from '../../model/reference.validation';

const { DOI } = FORM_FIELDS;
const { REFERENCE_URL: DOI_HELPER_TEXT } = HELPER_TEXT;

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
      defaultValues={{ [DOI.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.doi)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={DOI.label} id={DOI.name} />
          <FormTextField
            control={control}
            name={DOI.name}
            id={DOI.name}
            helperText={DOI_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            isDoiField
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={DOI.label} value={data?.doi} disabled={disabled} onEdit={onEdit}>
          {data?.doi && data?.doi.length > 0 && <DoiPreview doi={data.doi} className="ml-2" />}
        </Preview>
      )}
    />
  );
};
