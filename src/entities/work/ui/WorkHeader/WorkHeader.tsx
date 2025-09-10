'use client';

import DeleteIcon from '@mui/icons-material/Delete';

import { FORM_FIELDS, IDs } from '@/src/shared/constants';
import { type FormFieldOption } from '@/src/shared/interfaces';
import { Button, DateField, FormsWrapper, FormWithPreview, IconButton, TextField, Typography } from '@/src/shared/ui';

import { publicationDateValidationSchema, workStatusValidationSchema } from '../../model/work.validation';

const { WORK_STATUS, PUBLICATION_DATE } = FORM_FIELDS;
const { WORK_STATUS: WORK_STATUS_ID, PUBLICATION_DATE: PUBLICATION_DATE_ID } = IDs.FORM_FIELDS;

type WorkHeaderProps = {
  title: string;
  workStatusOptions: FormFieldOption[];
};

const WorkHeader = ({ title, workStatusOptions }: WorkHeaderProps) => {
  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-2xl bg-[var(--color-background-alt)] px-8 py-4 shadow-xl">
      <div className="flex justify-between">
        <Typography variant="h1" component="h1">
          {title}
        </Typography>
        <div className="flex h-max flex-shrink-0 gap-4">
          <IconButton aria-label="delete" size="small">
            <DeleteIcon fontSize="small" />
          </IconButton>
          <Button variant="contained">Done</Button>
        </div>
      </div>

      <FormsWrapper>
        <FormWithPreview
          validationSchema={workStatusValidationSchema}
          label={WORK_STATUS.label}
          name={WORK_STATUS.name}
          id={WORK_STATUS_ID}
        >
          {({ control }) => (
            <TextField
              key="field"
              control={control}
              name={WORK_STATUS.name}
              select
              options={workStatusOptions}
              fullWidth
            />
          )}
        </FormWithPreview>

        <FormWithPreview
          validationSchema={publicationDateValidationSchema}
          label={PUBLICATION_DATE.label}
          name={PUBLICATION_DATE.name}
          id={PUBLICATION_DATE_ID}
        >
          {({ control }) => <DateField key="field" className="w-full" control={control} name={PUBLICATION_DATE.name} />}
        </FormWithPreview>
      </FormsWrapper>
    </div>
  );
};

export default WorkHeader;
