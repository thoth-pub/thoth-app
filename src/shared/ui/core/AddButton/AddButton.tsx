'use client';

import AddIcon from '@mui/icons-material/Add';
import { type ReactNode } from 'react';

import { mergeStyles } from '@/src/shared/utils';

import Button, { type ButtonProps } from '../Button/Button';

type AddButtonProps = Partial<{
  children: Readonly<ReactNode>;
  StartIcon: typeof AddIcon;
  onAdd: () => void;
}> &
  Omit<ButtonProps, 'onClick'>;

const iconClassNames = 'opacity-0 transition duration-300 ease-in-out ml-1';

const buttonStyles = { minHeight: '1.5rem', minWidth: '1.5rem' };

const AddButton = ({ onAdd, children, StartIcon = AddIcon, ...props }: AddButtonProps) => {
  return (
    <Button
      {...props}
      onClick={onAdd}
      size="small"
      fullWidth
      endIcon={<StartIcon fontSize="small" className={iconClassNames} />}
      sx={buttonStyles}
      className={mergeStyles(
        'capitalized flex w-full min-w-max justify-between hover:[&>span>svg]:opacity-100',
        props.className,
      )}
    >
      {children}
    </Button>
  );
};

export default AddButton;
