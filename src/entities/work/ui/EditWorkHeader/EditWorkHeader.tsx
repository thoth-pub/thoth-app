'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import type { BaseEditSectionProps } from '@/src/shared';
import { Button, IconButton, Typography } from '@/src/shared/ui';

import EditWorkHeaderForm, { type EditWorkHeaderFormProps } from './components/EditWorkHeaderForm';
import useEditWorkHeader from './useEditWorkHeader';

type EditWorkHeaderProps = BaseEditSectionProps & Omit<EditWorkHeaderFormProps, 'status'>;

const EditWorkHeader = ({ workId, queryToken, workStatusOptions }: EditWorkHeaderProps) => {
  const { title, status, isPublicationDateDisabled, minDate, deleteWork, changeWorkStatus } = useEditWorkHeader({
    workId,
    queryToken,
  });

  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-2xl bg-[var(--color-background-alt)] px-8 py-4 shadow-xl">
      <div className="flex justify-between">
        <Typography variant="h1" component="h1">
          {title}
        </Typography>
        <div className="flex h-max flex-shrink-0 gap-4">
          <IconButton aria-label="delete" size="small" onClick={() => deleteWork(workId)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
          <Button variant="contained">Done</Button>
        </div>
      </div>

      <EditWorkHeaderForm
        workStatusOptions={workStatusOptions}
        status={status}
        isPublicationDateDisabled={isPublicationDateDisabled}
        onStatusUpdate={changeWorkStatus}
        minDate={minDate}
      />
    </div>
  );
};

export default EditWorkHeader;
