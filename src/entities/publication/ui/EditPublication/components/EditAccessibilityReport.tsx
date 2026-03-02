import { HELPER_TEXT, IDs, prettifyUrlPreview } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { PublicationAccessibilityReportUrlForm } from '../../../model/publication.types';
import { accessibilityReportUrlValidationSchema } from '../../../model/publication.validation';

type EditAccessibilityReportProps = Partial<{
  report: string;
  onSubmit: (data: string) => void;
}>;

const { PUBLICATION_ACCESSIBILITY_REPORT_URL } = FORM_FIELDS;

const { PUBLICATION_ACCESSIBILITY_REPORT_URL: PUBLICATION_ACCESSIBILITY_REPORT_URL_HELPER_TEXT } = HELPER_TEXT;

export const EditAccessibilityReport = (props: EditAccessibilityReportProps) => {
  const { report = '', onSubmit } = props;

  const handleSubmit = (data: PublicationAccessibilityReportUrlForm) => {
    onSubmit?.(data.accessibilityReportUrl ?? '');
  };

  return (
    <EditableContent
      isTableVariant
      formId={IDs.PUBLICATION_ACCESSIBILITY_REPORT_URL}
      defaultValues={{ [PUBLICATION_ACCESSIBILITY_REPORT_URL.name]: report }}
      validationSchema={accessibilityReportUrlValidationSchema}
      onSubmit={handleSubmit}
      borderTransparent
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel
            label={PUBLICATION_ACCESSIBILITY_REPORT_URL.label}
            id={PUBLICATION_ACCESSIBILITY_REPORT_URL.name}
          />

          <FormTextField
            control={control}
            name={PUBLICATION_ACCESSIBILITY_REPORT_URL.name}
            id={PUBLICATION_ACCESSIBILITY_REPORT_URL.name}
            helperText={PUBLICATION_ACCESSIBILITY_REPORT_URL_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            isUrlField
          />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={PUBLICATION_ACCESSIBILITY_REPORT_URL.label}
          value={prettifyUrlPreview(report)}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
