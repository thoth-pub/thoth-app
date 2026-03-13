'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { prettifyUrlPreview } from '@/src/shared/utils';

import { awardUrlValidationSchema } from '../../model/award.validation';

const { AWARD_URL } = FORM_FIELDS;
const { AWARD_URL: AWARD_URL_HELPER_TEXT } = HELPER_TEXT;

type EditAwardUrlProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditAwardUrl = (props: EditAwardUrlProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.AWARD_URL}
      borderTransparent
      isTableVariant
      validationSchema={awardUrlValidationSchema}
      defaultValues={{ [AWARD_URL.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.url)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={AWARD_URL.label} id={AWARD_URL.name} />
          <FormTextField
            control={control}
            name={AWARD_URL.name}
            id={AWARD_URL.name}
            helperText={AWARD_URL_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
            isUrlField
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={AWARD_URL.label} value={prettifyUrlPreview(data?.url)} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
