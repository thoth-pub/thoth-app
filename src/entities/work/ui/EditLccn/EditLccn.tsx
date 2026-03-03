'use client';

import { useWork } from '@/src/entities/work';
import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import type { BaseEditSectionProps } from '@/src/shared/types';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { LccnForm } from '../../model/work.types';
import { lccnValidationSchema } from '../../model/work.validation';

const { LCCN } = FORM_FIELDS;
const { WORK_LCCN } = HELPER_TEXT;

const EditOclc = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { work, updateWork } = useWork(workId);

  const lccnValue = work.lccn ?? '';

  const updateLccn = ({ lccn }: LccnForm) => {
    updateWork({ ...work, lccn: lccn ?? '' });
  };

  return (
    <EditableContent
      formId={IDs.WORK_LCCN}
      defaultValues={{ [LCCN.name]: lccnValue }}
      validationSchema={lccnValidationSchema}
      onSubmit={updateLccn}
      formFields={({ control, isHelperTextVisible }) => (
        <ContentWrapper>
          <FormFieldLabel label={LCCN.label} id={LCCN.name} />
          <FormTextField
            control={control}
            name={LCCN.name}
            id={LCCN.name}
            helperText={WORK_LCCN}
            isHelperTextVisible={isHelperTextVisible}
          />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview label={LCCN.label} value={lccnValue} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};

export default EditOclc;
