'use client';

import AddIcon from '@mui/icons-material/Add';
import { type ReactNode } from 'react';

import { mergeStyles } from '@/src/shared/utils';

import Button, { type ButtonProps } from '../Button/Button';
import Typography from '../Typography/Typography';

type AddButtonProps = Partial<{
  isTextHighlighted: boolean;
  children: Readonly<ReactNode>;
  StartIcon: typeof AddIcon;
  onAdd: () => void;
}> &
  ButtonProps;

const iconClassNames = 'opacity-0 transition duration-300 ease-in-out ml-1';

const buttonStyles = { minHeight: '1.5rem', minWidth: '1.5rem' };

const AddButton = ({ onAdd, children, isTextHighlighted, StartIcon = AddIcon, ...props }: AddButtonProps) => {
  return (
    <Button
      {...props}
      onClick={onAdd}
      size="small"
      startIcon={<StartIcon fontSize="small" className={iconClassNames} />}
      sx={buttonStyles}
      className={mergeStyles('min-w-max hover:[&>span>svg]:opacity-100', props.className)}
    >
      <Typography component="span" color={isTextHighlighted ? 'success' : 'primary'} className="capitalize">
        {children}
      </Typography>
    </Button>
  );
};

export default AddButton;
