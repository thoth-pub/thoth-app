import CloseIcon from '@mui/icons-material/Close';

import IconButton from '../IconButton/IconButton';

type CloseButtonProps = {
  className?: string;
  onClose?: () => void;
};

const CloseButton = ({ className, onClose }: CloseButtonProps) => {
  return (
    <IconButton onClick={onClose} aria-label="Close" className={className}>
      <CloseIcon />
    </IconButton>
  );
};

export default CloseButton;
