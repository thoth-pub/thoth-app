'use client';

import { useMemo } from 'react';

import { mergeStyles } from '@/src/shared';

import ButtonComponent, { type ButtonProps } from '../Button/Button';

type DataIndicatorProps = {
  isEmpty?: boolean;
  isValid?: boolean;
  isActive?: boolean;
  indicatorClassName?: string;
  onClick?: () => void;
} & ButtonProps;

const DataIndicator = (props: DataIndicatorProps) => {
  const { isEmpty = true, isValid = false, isActive = false, sx, indicatorClassName, onClick, ...rest } = props;

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
        minWidth: '30px',

        '@media (min-width: 1024px)': {
          minWidth: '40px',
        },

        '&.MuiButtonBase-root.MuiButton-root.Mui-disabled': {
          backgroundColor: 'transparent',
        },

        ...sx,
      }}
      variant="contained"
      {...rest}
    >
      <div
        className={mergeStyles(
          `flex h-4 w-4 shrink-0 overflow-clip rounded-full border-1 opacity-100 lg:h-5 lg:w-5 ${isActive ? 'border-[var(--color-yellow)]' : 'border-[var(--color-success)]'}`,
          indicatorClassName,
        )}
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
