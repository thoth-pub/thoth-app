import CheckIcon from '@mui/icons-material/Check';

import type { ButtonProps } from '../../core/Button/Button';
import IconButton from '../../core/IconButton/IconButton';

const SubmitButton = (props: Omit<ButtonProps, 'children' | 'sx'>) => {
  return (
    <IconButton
      {...props}
      sx={{
        backgroundColor: 'var(--color-icon-button-medium-background)',
        color: 'var(--color-icon-button-medium-text)',
        borderRadius: '5px',
        '&:hover': {
          backgroundColor: 'var(--color-icon-button-medium-background)',
          opacity: '0.75',
        },
      }}
    >
      <CheckIcon />
    </IconButton>
  );
};

export default SubmitButton;
