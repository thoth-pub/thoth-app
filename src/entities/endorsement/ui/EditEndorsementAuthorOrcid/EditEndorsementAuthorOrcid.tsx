'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { convertOrchidIdToText } from '@/src/shared/utils';

import { endorsementAuthorOrcidValidationSchema } from '../../model/endorsement.validation';

const { ENDORSEMENT_AUTHOR_ORCID } = FORM_FIELDS;
const { ENDORSEMENT_AUTHOR_ORCID: ENDORSEMENT_AUTHOR_ORCID_HELPER_TEXT } = HELPER_TEXT;

type EditEndorsementAuthorOrcidProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditEndorsementAuthorOrcid = (props: EditEndorsementAuthorOrcidProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.ENDORSEMENT_AUTHOR_ORCID}
      borderTransparent
      isTableVariant
      validationSchema={endorsementAuthorOrcidValidationSchema}
      defaultValues={{ [ENDORSEMENT_AUTHOR_ORCID.name]: defaultValue }}
      faq={ENDORSEMENT_AUTHOR_ORCID_HELPER_TEXT}
      onSubmit={(data) => onUpdate?.(data.authorOrcid)}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={ENDORSEMENT_AUTHOR_ORCID.label} id={ENDORSEMENT_AUTHOR_ORCID.name} />
          <FormTextField
            control={control}
            name={ENDORSEMENT_AUTHOR_ORCID.name}
            id={ENDORSEMENT_AUTHOR_ORCID.name}
            isOrcidField
          />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={ENDORSEMENT_AUTHOR_ORCID.label}
          value={defaultValue ? convertOrchidIdToText(defaultValue) : ''}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
