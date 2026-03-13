'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { endorsementAuthorNameValidationSchema } from '../../model/endorsement.validation';

const { ENDORSEMENT_AUTHOR_NAME } = FORM_FIELDS;
const { ENDORSEMENT_AUTHOR_NAME: ENDORSEMENT_AUTHOR_NAME_HELPER_TEXT } = HELPER_TEXT;

type EditEndorsementAuthorNameProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditEndorsementAuthorName = (props: EditEndorsementAuthorNameProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.ENDORSEMENT_AUTHOR_NAME}
      borderTransparent
      isTableVariant
      validationSchema={endorsementAuthorNameValidationSchema}
      defaultValues={{ [ENDORSEMENT_AUTHOR_NAME.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.authorName)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={ENDORSEMENT_AUTHOR_NAME.label} id={ENDORSEMENT_AUTHOR_NAME.name} />
          <FormTextField
            control={control}
            name={ENDORSEMENT_AUTHOR_NAME.name}
            id={ENDORSEMENT_AUTHOR_NAME.name}
            helperText={ENDORSEMENT_AUTHOR_NAME_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={ENDORSEMENT_AUTHOR_NAME.label}
          value={data?.authorName}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
