'use client';

import { TextField } from '@/src/shared/ui';

import { useChangeActivePublisher } from './useChangeActivePublisher';

type ChangeActivePublisherProps = {
  isHidden?: boolean;
};

const ChangeActivePublisher = ({ isHidden = false }: ChangeActivePublisherProps) => {
  const { activePublisher, publishersOptions, hideSelector, updateActivePublisher } = useChangeActivePublisher({
    isHidden,
  });

  return (
    <TextField
      options={publishersOptions}
      value={activePublisher?.id ?? ''}
      fullWidth
      select
      className={`w-[240px] shrink-0 ${hideSelector ? 'opacity-0' : 'opacity-100'}`}
      slotProps={{
        select: {
          MenuProps: {
            sx: {
              '& .MuiMenuItem-root': {
                textTransform: 'none',
              },
            },
          },
        },
      }}
      sx={{
        '& .MuiSelect-select': {
          textTransform: 'none',
        },
      }}
      onChange={(e) => updateActivePublisher(e.target.value)}
      disabled={publishersOptions.length <= 1}
    />
  );
};

export default ChangeActivePublisher;
