'use client';

import InfoOutlineIcon from '@mui/icons-material/InfoOutline';

import { CloseButton, IconButton, SubmitButton } from '@/src/shared/ui';

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
      <CloseButton onClose={onClose} />
      <IconButton onClick={onInfo} aria-label="Show info">
        <InfoOutlineIcon />
      </IconButton>
    </div>
  );
};

export default FormControlGroup;
