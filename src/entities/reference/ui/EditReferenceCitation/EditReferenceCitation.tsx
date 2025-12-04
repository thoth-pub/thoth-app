'use client';

import { HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { referenceCitationValidationSchema } from '../../model/reference.validation';

const { REFERENCE_CITATION } = FORM_FIELDS;
const { REFERENCE_CITATION: REFERENCE_CITATION_HELPER_TEXT } = HELPER_TEXT;

type EditReferenceCitationProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditReferenceCitation = (props: EditReferenceCitationProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.REFERENCE_CITATION}
      borderTransparent
      isTableVariant
      validationSchema={referenceCitationValidationSchema}
      defaultValues={{ [REFERENCE_CITATION.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.unstructuredCitation)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={REFERENCE_CITATION.label} id={REFERENCE_CITATION.name} />
          <FormTextField
            control={control}
            name={REFERENCE_CITATION.name}
            id={REFERENCE_CITATION.name}
            helperText={REFERENCE_CITATION_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={REFERENCE_CITATION.label}
          value={defaultValue ?? data?.unstructuredCitation}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
