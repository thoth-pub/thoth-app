'use client';

import { Direction, WorkStatus } from '@/gql/graphql';
import { directionOptions, workStatusOptions } from '@/src/shared/constants/formFields';
import { Pagination, TextField } from '@/src/shared/ui';

type TableFooterProps = {
  direction: Direction;
  page: number;
  pagesCount: number;
  loading: boolean;
  workStatus: WorkStatus | 'All';
  onWorkStatusChange: (workStatus: WorkStatus) => void;
  onDirectionChange: (direction: Direction) => void;
  onPageChange: (value: number) => void;
};

export const TableFooter = (props: TableFooterProps) => {
  const { direction, page, pagesCount, loading, workStatus, onWorkStatusChange, onDirectionChange, onPageChange } =
    props;

  return (
    <div className="ml-auto flex items-center gap-2">
      <TextField
        select
        options={[...workStatusOptions, { value: 'All', label: 'All' }]}
        value={workStatus}
        onChange={(e) => onWorkStatusChange(e.target.value as WorkStatus)}
        variant="standard"
      />
      <TextField
        select
        options={directionOptions}
        value={direction}
        onChange={(e) => onDirectionChange(e.target.value as Direction)}
        variant="standard"
      />
      <Pagination
        page={page}
        count={pagesCount}
        color="primary"
        showFirstButton
        showLastButton
        onChange={(_, value) => onPageChange(value)}
        disabled={loading}
      />
    </div>
  );
};
