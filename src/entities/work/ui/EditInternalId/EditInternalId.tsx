'use client';

import { useWork } from '@/src/entities/work';
import { type BaseEditSectionProps, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { EditButton, FormFieldLabel, FormTextField, InputLabel, TranslatedContent, Typography } from '@/src/shared/ui';
import { EditableContentAlt } from '@/src/shared/ui/layout/EditableContent/EditableContentAlt';

import { internalIdValidationSchema } from '../../model/work.validation';

const { INTERNAL_ID } = FORM_FIELDS;

const { WORK_INTERNAL_ID } = HELPER_TEXT;

const EditInternalId = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { work, updateWork } = useWork(workId);

  const updateInternalId = (internalId: string) => {
    updateWork({ ...work, reference: internalId });
  };

  return (
    <EditableContentAlt
      formId={IDs.WORK_INTERNAL_ID}
      borderTransparent
      isTableVariant
      defaultValues={{ [INTERNAL_ID.name]: work.reference }}
      validationSchema={internalIdValidationSchema}
      onSubmit={({ internalId }) => updateInternalId(internalId)}
      formFields={({ control, isHelperTextVisible }) => (
        <div className="flex flex-col gap-2">
          <FormFieldLabel label={INTERNAL_ID.label} id={INTERNAL_ID.name} />
          <FormTextField
            control={control}
            name={INTERNAL_ID.name}
            id={INTERNAL_ID.name}
            isHelperTextVisible={isHelperTextVisible}
            helperText={WORK_INTERNAL_ID}
          />
        </div>
      )}
      preview={({ disabled, onEdit }) => (
        <div className="flex flex-col gap-2">
          <InputLabel>
            <TranslatedContent content={INTERNAL_ID.label} namespace={NAMESPACES.enum.forms} />
          </InputLabel>
          <div className="group flex items-center gap-1">
            <Typography>{work.reference}</Typography>
            <EditButton onClick={onEdit} disabled={disabled} className="ml-auto opacity-0 group-hover:opacity-100" />
          </div>
        </div>
      )}
    />
  );
};

export default EditInternalId;
