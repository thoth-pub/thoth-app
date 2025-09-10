'use client';

import type { WorkStatus } from '@/src/entities/work/model/work.types';
import { FORM_FIELDS, IDs } from '@/src/shared/constants';
import { type FormFieldOption } from '@/src/shared/interfaces';
import { DateFormWithPreview, FormsWrapper, TextFormWithPreview } from '@/src/shared/ui';

import { publicationDateValidationSchema, workStatusValidationSchema } from '../../../model/work.validation';

export type WorkHeaderFormProps = {
  status: WorkStatus;
  workStatusOptions: FormFieldOption[];
};

const { WORK_STATUS, PUBLICATION_DATE } = FORM_FIELDS;
const { WORK_STATUS: WORK_STATUS_ID, PUBLICATION_DATE: PUBLICATION_DATE_ID } = IDs.FORM_FIELDS;

const WorkHeaderForm = ({ workStatusOptions, status }: WorkHeaderFormProps) => {
  const onSubmit = (data: unknown) => {
    console.log(data);
  };

  return (
    <FormsWrapper>
      <TextFormWithPreview
        validationSchema={workStatusValidationSchema}
        label={WORK_STATUS.label}
        name={WORK_STATUS.name}
        id={WORK_STATUS_ID}
        select
        options={workStatusOptions}
        defaultValue={status}
        onSubmit={onSubmit}
      />

      <DateFormWithPreview
        validationSchema={publicationDateValidationSchema}
        label={PUBLICATION_DATE.label}
        name={PUBLICATION_DATE.name}
        id={PUBLICATION_DATE_ID}
        onSubmit={onSubmit}
      />
    </FormsWrapper>
  );
};

export default WorkHeaderForm;
