'use client';

import { useMemo } from 'react';

import ButtonComponent, { type ButtonProps } from '../Button/Button';

type DataIndicatorProps = {
  isEmpty?: boolean;
  isValid?: boolean;
  isActive?: boolean;
  onClick?: () => void;
} & ButtonProps;

const DataIndicator = (props: DataIndicatorProps) => {
  const { isEmpty = true, isValid = false, isActive = false, sx, onClick, ...rest } = props;

  const percentage = useMemo(() => {
    if (isEmpty) return 0;
    if (isValid) return 100;
    return 50;
  }, [isEmpty, isValid]);

  return (
    <ButtonComponent
      onClick={onClick}
      sx={{
        backgroundColor: isActive ? 'primary.main' : 'transparent',
        boxShadow: 'unset',
        padding: '10px',
        minWidth: '40px',

        '&.MuiButtonBase-root.MuiButton-root.Mui-disabled': {
          backgroundColor: 'transparent',
        },

        ...sx,
      }}
      variant="contained"
      {...rest}
    >
      <div
        className={`flex h-5 w-5 overflow-clip rounded-full border-1 opacity-100 ${isActive ? 'border-[var(--color-yellow)]' : 'border-[var(--color-success)]'}`}
      >
        <div
          style={{ width: `${percentage}%` }}
          className={`h-full ${isActive ? 'bg-[var(--color-yellow)]' : 'bg-[var(--color-success)]'}`}
        />
      </div>
    </ButtonComponent>
  );
};

export default DataIndicator;
