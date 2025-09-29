'use client';

import { useWork } from '@/src/entities/work';
import type { WorkId, WorkType, WorkTypeForm } from '@/src/entities/work/model/work.types';
import { workTypeValidationSchema } from '@/src/entities/work/model/work.validation';
import { convertOptionToString, HELPER_TEXT, IDs, type QueryToken } from '@/src/shared';
import { FORM_FIELDS, workTypeOptions } from '@/src/shared/constants/formFields';
import { ContentWrapper, FormTextField, Preview } from '@/src/shared/ui';
import FormFieldLabel from '@/src/shared/ui/forms/FormFieldLabel/FormFieldLabel';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

type EditImprintProps = {
  workId: WorkId;
  queryToken: QueryToken;
  recommended?: boolean;
};

const { WORK_TYPE } = FORM_FIELDS;

export const EditImprint = ({ workId, queryToken, recommended = false }: EditImprintProps) => {
  const { work, updateWorkRef } = useWork(workId, queryToken);

  const value = convertOptionToString(work?.type ?? '');
  const showIndicator = recommended && !value;

  const updateWorkType = ({ workType }: WorkTypeForm) => {
    updateWorkRef({ ...work, type: workType as WorkType });
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
