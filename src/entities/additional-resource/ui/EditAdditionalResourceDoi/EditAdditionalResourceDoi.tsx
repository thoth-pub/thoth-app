'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { additionalResourceDoiValidationSchema } from '../../model/additional-resource.validation';

const { DOI } = FORM_FIELDS;
const { DOI: DOI_HELPER_TEXT } = HELPER_TEXT;

type EditAdditionalResourceDoiProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditAdditionalResourceDoi = (props: EditAdditionalResourceDoiProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.ADDITIONAL_RESOURCE_DOI}
      borderTransparent
      isTableVariant
      validationSchema={additionalResourceDoiValidationSchema}
      defaultValues={{ [DOI.name]: defaultValue }}
      faq={DOI_HELPER_TEXT}
      onSubmit={(data) => onUpdate?.(data.doi)}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={DOI.label} id={DOI.name} />
          <FormTextField control={control} name={DOI.name} id={DOI.name} isDoiField />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={DOI.label} value={data?.doi} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
