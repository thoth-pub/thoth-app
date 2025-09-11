'use client';

import DeleteIcon from '@mui/icons-material/Delete';

import type { QueryToken } from '@/src/shared';
import { Button, IconButton, Typography } from '@/src/shared/ui';

import type { WorkId } from '../../model/work.types';
import WorkHeaderForm, { type WorkHeaderFormProps } from './components/WorkHeaderForm';
import useWorkHeader from './useWorkHeader';

type WorkHeaderProps = {
  queryToken: QueryToken;
  workId: WorkId;
} & Omit<WorkHeaderFormProps, 'status'>;

const WorkHeader = ({ workId, queryToken, workStatusOptions }: WorkHeaderProps) => {
  const { title, status, isPublicationDateDisabled, minDate, deleteWork, changeWorkStatus } = useWorkHeader({
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
          <IconButton aria-label="delete" size="small" onClick={() => deleteWork()}>
            <DeleteIcon fontSize="small" />
          </IconButton>
          <Button variant="contained">Done</Button>
        </div>
      </div>

      <WorkHeaderForm
        workStatusOptions={workStatusOptions}
        status={status}
        isPublicationDateDisabled={isPublicationDateDisabled}
        onStatusUpdate={changeWorkStatus}
        minDate={minDate}
      />
    </div>
  );
};

export default WorkHeader;
