'use client';

import { useTranslation } from 'react-i18next';

import { useWork } from '@/src/entities/work';
import type { WorkType, WorkTypeForm } from '@/src/entities/work/model/work.types';
import { workTypeValidationSchema } from '@/src/entities/work/model/work.validation';
import { type BaseEditSectionProps, convertOptionToString, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormTextField, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';
import { getWorkTypeOptions } from '@/src/shared/utils';

const { WORK_TYPE } = FORM_FIELDS;

export const EditWorkType = ({ workId }: BaseEditSectionProps) => {
  const { work, updateWork } = useWork(workId);
  const { t, i18n } = useTranslation();
  const value = t(convertOptionToString(work?.type ?? '').toLowerCase());

  const updateWorkType = ({ workType }: WorkTypeForm) => {
    updateWork({ ...work, type: workType as WorkType });
  };

  const options = getWorkTypeOptions(i18n.language);

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
            options={options}
            helperText={HELPER_TEXT.WORK_TYPE}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview label={WORK_TYPE.label} value={value} disabled={disabled} onEdit={onEdit} capitalize />
      )}
    />
  );
};

export default EditWorkType;
