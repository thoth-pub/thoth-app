'use client';

import { useMemo } from 'react';

import IconButtonComponent from '../IconButton/IconButton';

type DataIndicatorProps = {
  isEmpty?: boolean;
  isValid?: boolean;
  onClick?: () => void;
};

const DataIndicator = (props: DataIndicatorProps) => {
  const { isEmpty = true, isValid = false, onClick } = props;

  const percentage = useMemo(() => {
    if (isEmpty) return 0;
    if (isValid) return 100;
    return 50;
  }, [isEmpty, isValid]);

  return (
    <IconButtonComponent
      onClick={onClick}
      sx={{
        color: 'transparent',
        padding: 0,
      }}
    >
      <div className="flex h-5 w-5 overflow-clip rounded-full border-1 border-[var(--color-success)]">
        <div style={{ width: `${percentage}%` }} className="h-full bg-[var(--color-success)]" />
      </div>
    </IconButtonComponent>
  );
};

export default DataIndicator;
