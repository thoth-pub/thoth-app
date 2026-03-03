'use client';

import { useWork } from '@/src/entities/work';
import type { WorkType, WorkTypeForm } from '@/src/entities/work/model/work.types';
import { workTypeValidationSchema } from '@/src/entities/work/model/work.validation';
import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { BaseEditSectionProps } from '@/src/shared/types';
import { ContentWrapper, FormTextField, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { convertOptionToString, workTypeOptions } from '@/src/shared/utils';

const { WORK_TYPE } = FORM_FIELDS;

export const EditWorkType = ({ workId }: BaseEditSectionProps) => {
  const { work, updateWork } = useWork(workId);
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });

  const updateWorkType = ({ workType }: WorkTypeForm) => {
    updateWork({ ...work, type: workType as WorkType });
  };

  return (
    <EditableContent
      formId={IDs.WORK_TYPE}
      defaultValues={{ [WORK_TYPE.name]: work?.type }}
      validationSchema={workTypeValidationSchema}
      onSubmit={updateWorkType}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={WORK_TYPE.label} id={WORK_TYPE.name} />
          <FormTextField
            control={control}
            name={WORK_TYPE.name}
            id={WORK_TYPE.name}
            select
            options={workTypeOptions}
            helperText={HELPER_TEXT.WORK_TYPE}
            isHelperTextVisible={isHelperTextVisible}
            translateOptions
          />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview
          label={WORK_TYPE.label}
          value={t(convertOptionToString(work.type).toLowerCase())}
          disabled={disabled}
          onEdit={onEdit}
          capitalize
        />
      )}
    />
  );
};

export default EditWorkType;
