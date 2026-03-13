'use client';

import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { awardCategoryValidationSchema } from '../../model/award.validation';

const { AWARD_CATEGORY } = FORM_FIELDS;
const { AWARD_CATEGORY: AWARD_CATEGORY_HELPER_TEXT } = HELPER_TEXT;

type EditAwardCategoryProps = {
  defaultValue?: string;
  onUpdate?: (data: string) => void;
};

export const EditAwardCategory = (props: EditAwardCategoryProps) => {
  const { defaultValue = '', onUpdate } = props;

  return (
    <EditableContent
      formId={IDs.AWARD_CATEGORY}
      borderTransparent
      isTableVariant
      validationSchema={awardCategoryValidationSchema}
      defaultValues={{ [AWARD_CATEGORY.name]: defaultValue }}
      onSubmit={(data) => onUpdate?.(data.category)}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={AWARD_CATEGORY.label} id={AWARD_CATEGORY.name} />
          <FormTextField
            control={control}
            name={AWARD_CATEGORY.name}
            id={AWARD_CATEGORY.name}
            helperText={AWARD_CATEGORY_HELPER_TEXT}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ data, disabled, onEdit }) => (
        <Preview label={AWARD_CATEGORY.label} value={data?.category} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};
