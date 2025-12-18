import {
  AccessibilityStandardType,
  convertOptionToString,
  FormFieldOption,
  HELPER_TEXT,
  IDs,
  PublicationType,
} from '@/src/shared';
import {
  accessibilityAdditionalEpubStandardOptions,
  accessibilityAdditionalPDFStandardOptions,
  FORM_FIELDS,
} from '@/src/shared/constants/formFields';
import {
  ContentWrapper,
  DeleteButton,
  FormFieldLabel,
  FormFieldWithControlsWrapper,
  FormTextField,
  Preview,
} from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import {
  PublicationAccessibilityAdditionalStandardForm,
  PublicationType as TPublicationType,
} from '../../../model/publication.types';
import { accessibilityAdditionalStandardValidationSchema } from '../../../model/publication.validation';

type EditAccessibilityAdditionalStandardProps = {
  publicationType: TPublicationType;
  standard: AccessibilityStandardType | null;
  onSubmit?: (data: AccessibilityStandardType) => void;
  onDelete?: () => void;
};

const { PUBLICATION_ACCESSIBILITY_ADDITIONAL_STANDARD } = FORM_FIELDS;

const { PUBLICATION_ACCESSIBILITY_ADDITIONAL_STANDARD: STANDARD_HELPER_TEXT } = HELPER_TEXT;

export const EditAccessibilityAdditionalStandard = (props: EditAccessibilityAdditionalStandardProps) => {
  const { publicationType, standard, onSubmit, onDelete } = props;

  const options: Record<TPublicationType, FormFieldOption[]> = {
    [PublicationType.enum.Pdf]: accessibilityAdditionalPDFStandardOptions,
    [PublicationType.enum.Epub]: accessibilityAdditionalEpubStandardOptions,
    [PublicationType.enum.Azw3]: [],
    [PublicationType.enum.Docx]: [],
    [PublicationType.enum.FictionBook]: [],
    [PublicationType.enum.Html]: [],
    [PublicationType.enum.Mobi]: [],
    [PublicationType.enum.Mp3]: [],
    [PublicationType.enum.Paperback]: [],
    [PublicationType.enum.Hardback]: [],
    [PublicationType.enum.Wav]: [],
    [PublicationType.enum.Xml]: [],
  };

  const handleSubmit = (data: PublicationAccessibilityAdditionalStandardForm) => {
    onSubmit?.(data.accessibilityAdditionalStandard);
  };

  return (
    <EditableContent
      isTableVariant
      formId={IDs.PUBLICATION_ACCESSIBILITY_ADDITIONAL_STANDARD}
      defaultValues={{ [PUBLICATION_ACCESSIBILITY_ADDITIONAL_STANDARD.name]: standard ?? undefined }}
      validationSchema={accessibilityAdditionalStandardValidationSchema}
      onSubmit={handleSubmit}
      borderTransparent
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel
            label={PUBLICATION_ACCESSIBILITY_ADDITIONAL_STANDARD.label}
            id={PUBLICATION_ACCESSIBILITY_ADDITIONAL_STANDARD.name}
          />
          <FormFieldWithControlsWrapper>
            <FormTextField
              control={control}
              options={options[publicationType]}
              select
              name={PUBLICATION_ACCESSIBILITY_ADDITIONAL_STANDARD.name}
              id={PUBLICATION_ACCESSIBILITY_ADDITIONAL_STANDARD.name}
              helperText={STANDARD_HELPER_TEXT}
              isHelperTextVisible={isHelperTextVisible}
              fullWidth
            />
            <DeleteButton onClick={onDelete} disabled={!standard} />
          </FormFieldWithControlsWrapper>
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={PUBLICATION_ACCESSIBILITY_ADDITIONAL_STANDARD.label}
          value={convertOptionToString(standard ?? '')}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
