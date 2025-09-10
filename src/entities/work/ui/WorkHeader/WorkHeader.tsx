'use client';

import DeleteIcon from '@mui/icons-material/Delete';

import { Button, IconButton, Typography } from '@/src/shared/ui';

import WorkHeaderForm, { type WorkHeaderFormProps } from './components/WorkHeaderForm';

type WorkHeaderProps = {
  title: string;
} & WorkHeaderFormProps;

const WorkHeader = ({ title, workStatusOptions, status }: WorkHeaderProps) => {
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

      <WorkHeaderForm workStatusOptions={workStatusOptions} status={status} />
    </div>
  );
};

export default WorkHeader;
