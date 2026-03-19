import { accessibilityExceptionOptions, FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { AccessibilityExceptionType } from '@/src/shared/types';
import {
  ContentWrapper,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  FormTextField,
  Preview,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { convertOptionToString } from '@/src/shared/utils';

import { PublicationAccessibilityExceptionForm } from '../../../model/publication.types';
import { accessibilityExceptionValidationSchema } from '../../../model/publication.validation';

type EditAccessibilityExceptionProps = {
  exception: AccessibilityExceptionType | null;
  onSubmit?: (data: AccessibilityExceptionType) => void;
  onDelete?: () => void;
};

const { PUBLICATION_ACCESSIBILITY_EXCEPTION } = FORM_FIELDS;

const { PUBLICATION_ACCESSIBILITY_EXCEPTION: PUBLICATION_ACCESSIBILITY_EXCEPTION_HELPER_TEXT } = HELPER_TEXT;

export const EditAccessibilityException = (props: EditAccessibilityExceptionProps) => {
  const { exception, onSubmit, onDelete } = props;

  const handleSubmit = (data: PublicationAccessibilityExceptionForm) => {
    onSubmit?.(data.accessibilityException);
  };

  return (
    <EditableContent
      isTableVariant
      formId={IDs.PUBLICATION_ACCESSIBILITY_EXCEPTION}
      defaultValues={{ [PUBLICATION_ACCESSIBILITY_EXCEPTION.name]: exception ?? undefined }}
      validationSchema={accessibilityExceptionValidationSchema}
      onSubmit={handleSubmit}
      borderTransparent
      faq={PUBLICATION_ACCESSIBILITY_EXCEPTION_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel
            label={PUBLICATION_ACCESSIBILITY_EXCEPTION.label}
            id={PUBLICATION_ACCESSIBILITY_EXCEPTION.name}
          />
          <FormFieldWithControlsWrapper>
            <FormTextField
              control={control}
              options={accessibilityExceptionOptions}
              select
              name={PUBLICATION_ACCESSIBILITY_EXCEPTION.name}
              id={PUBLICATION_ACCESSIBILITY_EXCEPTION.name}
              fullWidth
            />
            <DeleteButton onClick={onDelete} disabled={!exception} />
          </FormFieldWithControlsWrapper>
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={PUBLICATION_ACCESSIBILITY_EXCEPTION.label}
          value={convertOptionToString(exception ?? '')}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
