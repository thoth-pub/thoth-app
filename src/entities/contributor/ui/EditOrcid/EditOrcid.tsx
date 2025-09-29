import { HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormTextField, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { OrcidForm, orcidValidationSchema } from '../../model/contributor.validation';

const { ORCID } = FORM_FIELDS;
const { CONTRIBUTOR_ORCID: CONTRIBUTOR_ORCID_HELPER_TEXT } = HELPER_TEXT;

type EditOrcidProps = {
  disabled?: boolean;
  orcidId?: string;
  recommended: boolean;
  onSubmit: (data: OrcidForm) => void;
};

const EditOrcid = (props: EditOrcidProps) => {
  const { orcidId, recommended, disabled, onSubmit } = props;

  const value = orcidId ?? '';
  const showPreviewIndicator = recommended && value.length > 0;

  return (
    <EditableContent
      isTableVariant
      formId={IDs.CONTRIBUTOR_ORCID}
      defaultValues={{ [ORCID.name]: orcidId }}
      validationSchema={orcidValidationSchema}
      onSubmit={onSubmit}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={ORCID.label} id={ORCID.name} recommended={showPreviewIndicator} />
          <FormTextField
            control={control}
            name={ORCID.name}
            fullWidth
            helperText={CONTRIBUTOR_ORCID_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            isRorField
            disabled={disabled}
          />
        </ContentWrapper>
      )}
      preview={({ onEdit }) => (
        <Preview
          disabled={disabled}
          label={ORCID.label}
          value={orcidId}
          recommended={showPreviewIndicator}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditOrcid;
