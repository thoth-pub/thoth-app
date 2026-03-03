import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormTextField, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { getProtocolPrefix, prettifyUrlPreview } from '@/src/shared/utils';

import { WebsiteUrlForm, websiteUrlValidationSchema } from '../../model/contributor.validation';

const { WEBSITE_URL } = FORM_FIELDS;
const { CONTRIBUTOR_WEBSITE_URL: CONTRIBUTOR_WEBSITE_URL_HELPER_TEXT } = HELPER_TEXT;

type EditWebsiteProps = {
  websiteUrl?: string;
  disabled?: boolean;
  onSubmit: (data: WebsiteUrlForm) => void;
};

export const EditWebsite = (props: EditWebsiteProps) => {
  const { websiteUrl, disabled, onSubmit } = props;

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
          <FormFieldLabel label={WEBSITE_URL.label} id={WEBSITE_URL.name} />
          <FormTextField
            control={control}
            name={WEBSITE_URL.name}
            id={WEBSITE_URL.name}
            helperText={CONTRIBUTOR_WEBSITE_URL_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            isUrlField
            disabled={disabled}
            predefinedPrefix={getProtocolPrefix(websiteUrl ?? '')}
          />
        </ContentWrapper>
      )}
      preview={({ disabled: disabledPreview, onEdit }) => (
        <Preview
          label={WEBSITE_URL.label}
          value={prettifyUrlPreview(websiteUrl)}
          disabled={disabledPreview || disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditWebsite;
