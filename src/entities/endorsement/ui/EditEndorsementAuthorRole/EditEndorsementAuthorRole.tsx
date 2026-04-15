'use client';

import removeMd from 'remove-markdown';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { endorsementAuthorRoleValidationSchema } from '../../model/endorsement.validation';

const { ENDORSEMENT_AUTHOR_ROLE } = FORM_FIELDS;
const { ENDORSEMENT_AUTHOR_ROLE: ENDORSEMENT_AUTHOR_ROLE_HELPER_TEXT } = HELPER_TEXT;

type EditEndorsementAuthorRoleProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditEndorsementAuthorRole = (props: EditEndorsementAuthorRoleProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.ENDORSEMENT_AUTHOR_ROLE}
      borderTransparent
      isTableVariant
      validationSchema={endorsementAuthorRoleValidationSchema}
      defaultValues={{ [ENDORSEMENT_AUTHOR_ROLE.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.authorRole)}
      faq={ENDORSEMENT_AUTHOR_ROLE_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={ENDORSEMENT_AUTHOR_ROLE.label} id={ENDORSEMENT_AUTHOR_ROLE.name} />
          <FormTextField control={control} name={ENDORSEMENT_AUTHOR_ROLE.name} id={ENDORSEMENT_AUTHOR_ROLE.name} />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={ENDORSEMENT_AUTHOR_ROLE.label}
          value={removeMd(data?.authorRole ?? '')}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
