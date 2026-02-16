'use client';

import { type FormFieldOption, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormTextField, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import { SetImprintFormType } from '../../model/set.types';
import { setImprintValidationSchema } from '../../model/set.validation';

type EditSetImprintProps = {
  imprintId: string;
  imprintOptions: FormFieldOption[];
  disabled?: boolean;
  onSubmit: (imprintId: string) => void;
};

const { IMPRINT } = FORM_FIELDS;

export const EditSetImprint = ({ imprintId, imprintOptions, disabled = true, onSubmit }: EditSetImprintProps) => {
  const imprint = imprintOptions.find((option) => option.value === imprintId);

  const isFieldDisable = disabled || imprintOptions.length < 1;

  const updateImprint = ({ imprintId }: SetImprintFormType) => {
    onSubmit(imprintId);
  };

  return (
    <EditableContent
      formId={IDs.SET_IMPRINT}
      defaultValues={{ [IMPRINT.name]: imprintId }}
      validationSchema={setImprintValidationSchema}
      onSubmit={updateImprint}
      isTableVariant
      borderTransparent
      isDisabled={isFieldDisable}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={IMPRINT.label} id={IMPRINT.name} />
          <FormTextField
            control={control}
            name={IMPRINT.name}
            id={IMPRINT.name}
            select
            options={imprintOptions}
            helperText={HELPER_TEXT.IMPRINT}
            isHelperTextVisible={isHelperTextVisible}
            disabled={isFieldDisable}
            slotProps={{
              select: {
                MenuProps: {
                  sx: {
                    '& .MuiMenuItem-root': {
                      textTransform: 'none',
                    },
                  },
                },
              },
            }}
          />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={IMPRINT.label}
          value={imprint?.label ?? ''}
          disabled={disabled || isFieldDisable}
          onEdit={onEdit}
        />
      )}
    />
  );
};

export default EditSetImprint;
