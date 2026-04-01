import { useMemo } from 'react';

import { WorkStatuses } from '@/src/shared/constants';
import { Chip, TranslatedContent } from '@/src/shared/ui';
import { convertOptionToString, mergeStyles } from '@/src/shared/utils';

import type { WorkStatus } from '../../model/work.types';

type WorkStatusChipProps = {
  status: WorkStatus;
  className?: string;
};

export const WorkStatusChip = (props: WorkStatusChipProps) => {
  const { status, className } = props;

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
      className={mergeStyles('capitalize', className)}
      sx={{
        '&:before': {
          content: `"• "`,
          fontSize: '1.5rem',
          pr: '0.25rem',
          color: indicatiorColor,
        },
      }}
      label={<TranslatedContent content={convertOptionToString(status).toLowerCase()} />}
    />
  );
};

export default WorkStatusChip;
