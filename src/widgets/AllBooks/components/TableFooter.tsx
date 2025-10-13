'use client';

import { Direction } from '@/gql/graphql';
import { directionOptions } from '@/src/shared/constants/formFields';
import { Pagination, TextField } from '@/src/shared/ui';

type TableFooterProps = {
  direction: Direction;
  page: number;
  pagesCount: number;
  loading: boolean;
  onDirectionChange: (direction: Direction) => void;
  onPageChange: (value: number) => void;
};

export const TableFooter = (props: TableFooterProps) => {
  const { direction, page, pagesCount, loading, onDirectionChange, onPageChange } = props;

  return (
    <div className="ml-auto flex items-center gap-2">
      <TextField
        select
        options={directionOptions}
        value={direction}
        onChange={(e) => onDirectionChange(e.target.value as Direction)}
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
