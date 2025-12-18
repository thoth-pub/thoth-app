import { AccessibilityStandardType, convertOptionToString, HELPER_TEXT, IDs } from '@/src/shared';
import { accessibilityStandardOptions, FORM_FIELDS } from '@/src/shared/constants/formFields';
import {
  ContentWrapper,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  FormTextField,
  Preview,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { PublicationAccessibilityStandardForm } from '../../../model/publication.types';
import { accessibilityStandardValidationSchema } from '../../../model/publication.validation';

type EditAccessibilityStandardProps = {
  standard: AccessibilityStandardType | null;
  onSubmit?: (data: AccessibilityStandardType) => void;
  onDelete?: () => void;
};

const { PUBLICATION_ACCESSIBILITY_STANDARD } = FORM_FIELDS;

const { PUBLICATION_ACCESSIBILITY_STANDARD: PUBLICATION_ACCESSIBILITY_STANDARD_HELPER_TEXT } = HELPER_TEXT;

export const EditAccessibilityStandard = (props: EditAccessibilityStandardProps) => {
  const { standard, onSubmit, onDelete } = props;

  const handleSubmit = (data: PublicationAccessibilityStandardForm) => {
    onSubmit?.(data.accessibilityStandard);
  };

  return (
    <EditableContent
      isTableVariant
      formId={IDs.PUBLICATION_ACCESSIBILITY_STANDARD}
      defaultValues={{ [PUBLICATION_ACCESSIBILITY_STANDARD.name]: standard ?? undefined }}
      validationSchema={accessibilityStandardValidationSchema}
      onSubmit={handleSubmit}
      borderTransparent
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel
            label={PUBLICATION_ACCESSIBILITY_STANDARD.label}
            id={PUBLICATION_ACCESSIBILITY_STANDARD.name}
          />
          <FormFieldWithControlsWrapper>
            <FormTextField
              control={control}
              options={accessibilityStandardOptions}
              select
              name={PUBLICATION_ACCESSIBILITY_STANDARD.name}
              id={PUBLICATION_ACCESSIBILITY_STANDARD.name}
              helperText={PUBLICATION_ACCESSIBILITY_STANDARD_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              fullWidth
            />
            <DeleteButton onClick={onDelete} disabled={!standard} />
          </FormFieldWithControlsWrapper>
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={PUBLICATION_ACCESSIBILITY_STANDARD.label}
          value={convertOptionToString(standard ?? '')}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
