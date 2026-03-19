'use client';

import { useWork } from '@/src/entities/work';
import { FORM_FIELDS, HELPER_TEXT, IDs } from '@/src/shared/constants';
import type { BaseEditSectionProps } from '@/src/shared/types';
import { ContentWrapper, FormFieldLabel, FormTextField, Preview } from '@/src/shared/ui';
import { EditableContent } from '@/src/shared/ui/layout/EditableContent/EditableContent';

import type { OclcForm } from '../../model/work.types';
import { oclcValidationSchema } from '../../model/work.validation';

const { OCLC } = FORM_FIELDS;
const { WORK_OCLC } = HELPER_TEXT;

const EditOclc = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { work, updateWork } = useWork(workId);

  const oclcValue = work.oclc ?? '';

  const updateOclc = ({ oclc }: OclcForm) => {
    updateWork({ ...work, oclc: oclc ?? '' });
  };

  return (
    <EditableContent
      formId={IDs.WORK_OCLC}
      defaultValues={{ [OCLC.name]: oclcValue }}
      validationSchema={oclcValidationSchema}
      onSubmit={updateOclc}
      faq={WORK_OCLC}
      formFields={({ control }) => (
        <ContentWrapper>
          <FormFieldLabel label={OCLC.label} id={OCLC.name} />
          <FormTextField control={control} name={OCLC.name} id={OCLC.name} />
        </ContentWrapper>
      )}
      preview={({ disabled, onEdit }) => (
        <Preview label={OCLC.label} value={oclcValue} disabled={disabled} onEdit={onEdit} />
      )}
    />
  );
};

export default EditOclc;
