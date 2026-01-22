import { useMemo } from 'react';

import { convertOptionToString, WorkStatuses } from '@/src/shared';
import { Chip } from '@/src/shared/ui';

import type { WorkStatus } from '../../model/work.types';

type WorkStatusChipProps = {
  status: WorkStatus;
}

export const WorkStatusChip = (props: WorkStatusChipProps) => {
  const { status } = props;

  const indicatiorColor = useMemo(() => {
    switch (status) {
      case WorkStatuses.enum.Forthcoming:
        return 'warning.main';
      case WorkStatuses.enum.Active:
        return 'success.main';
      default:
        return 'error.main';
    }
  }, [status]);

  return (
    <Chip
      sx={{
        '&:before': {
          content: `"• "`,
          fontSize: '1.5rem',
          pr: '0.25rem',
          color: indicatiorColor,
        }
      }}
      label={convertOptionToString(status)}
    />
  )
}

export default WorkStatusChip;
