'use client';

import CloseIcon from '@mui/icons-material/Close';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';

import { IconButton, SubmitButton } from '@/src/shared/ui';

type FormControlGroupProps = {
  isDisabled?: boolean;
  formId?: string;
  onClose?: () => void;
  onInfo?: () => void;
};

const FormControlGroup = ({ isDisabled = false, formId, onClose, onInfo }: FormControlGroupProps) => {
  return (
    <div className="flex gap-1">
      <SubmitButton form={formId} type="submit" disabled={isDisabled} aria-label="submit form" />
      <IconButton onClick={onClose} aria-label="Close form">
        <CloseIcon />
      </IconButton>
      <IconButton onClick={onInfo} aria-label="Show info">
        <InfoOutlineIcon />
      </IconButton>
    </div>
  );
};

export default FormControlGroup;
