'use client';

import type { WorkStatus, WorkStatusForm } from '@/src/entities/work/model/work.types';
import { IDs } from '@/src/shared/constants';
import { FORM_FIELDS } from '@/src/shared/constants/formFields';
import { type FormFieldOption } from '@/src/shared/interfaces';
import { DateFormWithPreview, FormsWrapper, TextFormWithPreview } from '@/src/shared/ui';

import { publicationDateValidationSchema, workStatusValidationSchema } from '../../../model/work.validation';

export type EditWorkHeaderFormProps = {
  status: WorkStatus;
  workStatusOptions: FormFieldOption[];
  isPublicationDateDisabled?: boolean;
  minDate?: string;
  onStatusUpdate?: (data: WorkStatusForm) => void;
};

const { WORK_STATUS, PUBLICATION_DATE } = FORM_FIELDS;
const { WORK_STATUS: WORK_STATUS_ID, PUBLICATION_DATE: PUBLICATION_DATE_ID } = IDs.FORM_FIELDS;

const EditWorkHeaderForm = (props: EditWorkHeaderFormProps) => {
  const { workStatusOptions, status, isPublicationDateDisabled, minDate, onStatusUpdate } = props;

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
        onSubmit={onStatusUpdate}
      />

      {!isPublicationDateDisabled && (
        <DateFormWithPreview
          validationSchema={publicationDateValidationSchema}
          label={PUBLICATION_DATE.label}
          name={PUBLICATION_DATE.name}
          id={PUBLICATION_DATE_ID}
          minDate={minDate}
        />
      )}
    </FormsWrapper>
  );
};

export default EditWorkHeaderForm;
