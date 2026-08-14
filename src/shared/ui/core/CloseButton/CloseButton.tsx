import CloseIcon from '@mui/icons-material/Close';

import IconButton from '../IconButton/IconButton';

type CloseButtonProps = {
  className?: string;
  onClose?: () => void;
  disabled?: boolean;
};

const CloseButton = ({ className, onClose, disabled }: CloseButtonProps) => {
  return (
    <IconButton onClick={onClose} aria-label="Close" className={className} disabled={disabled}>
      <CloseIcon />
    </IconButton>
  );
};

export default CloseButton;
