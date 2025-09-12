'use client';

import CheckIcon from '@mui/icons-material/Check';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';

import { IconButton } from '@/src/shared/ui';

type FormControlGroupProps = {
  isDisabled: boolean;
  formId?: string;
};

const FormControlGroup = ({ isDisabled, formId }: FormControlGroupProps) => {
  return (
    <div className="flex gap-1">
      <IconButton
        disabled={isDisabled}
        sx={{
          backgroundColor: 'var(--color-icon-button-medium-background)',
          color: 'var(--color-icon-button-medium-text)',
          borderRadius: '5px',
          '&:hover': {
            backgroundColor: 'var(--color-icon-button-medium-background)',
            opacity: '0.75',
          },
        }}
        form={formId}
        type="submit"
      >
        <CheckIcon />
      </IconButton>
      <IconButton>
        <InfoOutlineIcon />
      </IconButton>
    </div>
  );
};

export default FormControlGroup;
