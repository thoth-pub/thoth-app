import CloseIcon from '@mui/icons-material/Close';

import IconButton from '../IconButton/IconButton';

type CloseButtonProps = {
  onClose?: () => void;
};

const CloseButton = ({ onClose }: CloseButtonProps) => {
  return (
    <IconButton onClick={onClose} aria-label="Close">
      <CloseIcon />
    </IconButton>
  );
};

export default CloseButton;
