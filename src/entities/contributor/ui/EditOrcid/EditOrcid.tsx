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
  onSubmit: (data: OrcidForm) => void;
};

const EditOrcid = (props: EditOrcidProps) => {
  const { orcidId, disabled, onSubmit } = props;

  return (
    <EditableContent
      isTableVariant
      formId={IDs.CONTRIBUTOR_ORCID}
      defaultValues={{ [ORCID.name]: orcidId }}
      validationSchema={orcidValidationSchema}
      onSubmit={onSubmit}
      borderTransparent
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={ORCID.label} id={ORCID.name} />
          <FormTextField
            control={control}
            name={ORCID.name}
            id={ORCID.name}
            helperText={CONTRIBUTOR_ORCID_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            disabled={disabled}
          />
        </ContentWrapper>
      )}
      preview={({ onEdit }) => <Preview disabled={disabled} label={ORCID.label} value={orcidId} onEdit={onEdit} />}
    />
  );
};

export default EditOrcid;
