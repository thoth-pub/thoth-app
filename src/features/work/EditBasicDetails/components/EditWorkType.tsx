'use client';

import { useWork } from '@/src/entities/work';
import type { WorkType, WorkTypeForm } from '@/src/entities/work/model/work.types';
import { workTypeValidationSchema } from '@/src/entities/work/model/work.validation';
import { type BaseRecommendedSectionProps, convertOptionToString, HELPER_TEXT, IDs } from '@/src/shared';
import { FORM_FIELDS, workTypeOptions } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormTextField, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

const { WORK_TYPE } = FORM_FIELDS;

export const EditImprint = ({ workId, queryToken, recommended = false }: BaseRecommendedSectionProps) => {
  const { work, updateWork } = useWork(workId, queryToken);

  const value = convertOptionToString(work?.type ?? '');
  const showIndicator = recommended && !value;

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
          <FormFieldLabel label={WORK_TYPE.label} id={WORK_TYPE.name} recommended={showIndicator} />
          <FormTextField
            control={control}
            name={WORK_TYPE.name}
            fullWidth
            select
            options={workTypeOptions}
            helperText={HELPER_TEXT.WORK_TYPE}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ onEdit }) => (
        <Preview label={WORK_TYPE.label} value={value} recommended={showIndicator} onEdit={onEdit} />
      )}
    />
  );
};

export default EditImprint;
