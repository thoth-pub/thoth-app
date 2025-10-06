import { HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormTextField, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { WebsiteUrlForm, websiteUrlValidationSchema } from '../../model/contributor.validation';

const { WEBSITE_URL } = FORM_FIELDS;
const { CONTRIBUTOR_WEBSITE_URL: CONTRIBUTOR_WEBSITE_URL_HELPER_TEXT } = HELPER_TEXT;

type EditWebsiteProps = {
  websiteUrl?: string;
  recommended: boolean;
  disabled?: boolean;
  onSubmit: (data: WebsiteUrlForm) => void;
};

export const EditWebsite = (props: EditWebsiteProps) => {
  const { websiteUrl, recommended, disabled, onSubmit } = props;

  const value = websiteUrl ?? '';
  const showPreviewIndicator = recommended && value.length === 0;

  return (
    <EditableContent
      isTableVariant
      formId={IDs.CONTRIBUTOR_WEBSITE_URL}
      defaultValues={{ [WEBSITE_URL.name]: websiteUrl }}
      validationSchema={websiteUrlValidationSchema}
      onSubmit={onSubmit}
      borderTransparent
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={WEBSITE_URL.label} id={WEBSITE_URL.name} recommended={showPreviewIndicator} />
          <FormTextField
            control={control}
            name={WEBSITE_URL.name}
            fullWidth
            helperText={CONTRIBUTOR_WEBSITE_URL_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            isUrlField
            disabled={disabled}
          />
        </ContentWrapper>
      )}
      preview={({ onEdit }) => (
        <Preview
          disabled={disabled}
          label={WEBSITE_URL.label}
          value={websiteUrl}
          recommended={showPreviewIndicator}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditWebsite;
