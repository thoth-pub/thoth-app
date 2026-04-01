'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { prettifyUrlPreview } from '@/src/shared/utils';

import { endorsementUrlValidationSchema } from '../../model/endorsement.validation';

const { ENDORSEMENT_URL } = FORM_FIELDS;
const { ENDORSEMENT_URL: ENDORSEMENT_URL_HELPER_TEXT } = HELPER_TEXT;

type EditEndorsementUrlProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditEndorsementUrl = (props: EditEndorsementUrlProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.ENDORSEMENT_URL}
      borderTransparent
      isTableVariant
      validationSchema={endorsementUrlValidationSchema}
      defaultValues={{ [ENDORSEMENT_URL.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.url)}
      faq={ENDORSEMENT_URL_HELPER_TEXT}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={ENDORSEMENT_URL.label} id={ENDORSEMENT_URL.name} />
          <FormTextField control={control} name={ENDORSEMENT_URL.name} id={ENDORSEMENT_URL.name} isUrlField />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview
          label={ENDORSEMENT_URL.label}
          value={prettifyUrlPreview(data?.url)}
          disabled={disabled}
          onEdit={onEdit}
        />
      )}
    />
  );
};
