'use client';

import { HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { referenceValidationSchema } from '../../model/reference.validation';

const { REFERENCE_CITATION } = FORM_FIELDS;
const { REFERENCE_CITATION: REFERENCE_CITATION_HELPER_TEXT } = HELPER_TEXT;

type EditReferenceCitationProps = {
  defaultValue?: string;
  recommended?: boolean;
  onUpdate?: (data: string) => void;
};

export const EditReferenceCitation = (props: EditReferenceCitationProps) => {
  const { defaultValue = '', recommended = false, onUpdate } = props;

  const showIndicator = recommended && defaultValue.length === 0;

  return (
    <EditableContent
      formId={IDs.REFERENCE_CITATION}
      borderTransparent
      isTableVariant
      validationSchema={referenceValidationSchema}
      defaultValues={{ [REFERENCE_CITATION.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.unstructuredCitation)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={REFERENCE_CITATION.label} id={REFERENCE_CITATION.name} recommended={showIndicator} />
          <FormTextField
            control={control}
            name={REFERENCE_CITATION.name}
            id={REFERENCE_CITATION.name}
            helperText={REFERENCE_CITATION_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, onEdit }) => (
        <Preview
          label={REFERENCE_CITATION.label}
          value={data?.unstructuredCitation}
          recommended={showIndicator}
          onEdit={onEdit}
        />
      )}
    />
  );
};
