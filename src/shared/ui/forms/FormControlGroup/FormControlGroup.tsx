'use client';

import InfoOutlineIcon from '@mui/icons-material/InfoOutline';

import { CloseButton, IconButton, SubmitButton } from '@/src/shared/ui';
import { mergeStyles } from '@/src/shared/utils';

type FormControlGroupProps = {
  isDisabled?: boolean;
  loading?: boolean;
  formId?: string;
  className?: string;
  showFaqButton?: boolean;
  onClose?: () => void;
  onInfo?: () => void;
};

const FormControlGroup = ({
  isDisabled = false,
  loading = false,
  formId,
  className,
  showFaqButton,
  onClose,
  onInfo,
}: FormControlGroupProps) => {
  return (
    <div className={mergeStyles('flex gap-1', className)}>
      <SubmitButton form={formId} type="submit" disabled={isDisabled} loading={loading} aria-label="submit form" />
      <CloseButton onClose={onClose} />
      {showFaqButton && (
        <IconButton onClick={onInfo} aria-label="Show info">
          <InfoOutlineIcon />
        </IconButton>
      )}
    </div>
  );
};

export default FormControlGroup;
