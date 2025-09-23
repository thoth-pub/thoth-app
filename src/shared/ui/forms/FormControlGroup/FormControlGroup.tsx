'use client';

import InfoOutlineIcon from '@mui/icons-material/InfoOutline';

import { IconButton, SubmitButton } from '@/src/shared/ui';

type FormControlGroupProps = {
  isDisabled?: boolean;
  formId?: string;
};

const FormControlGroup = ({ isDisabled = false, formId }: FormControlGroupProps) => {
  return (
    <div className="flex gap-1">
      <SubmitButton form={formId} type="submit" disabled={isDisabled} />
      <IconButton>
        <InfoOutlineIcon />
      </IconButton>
    </div>
  );
};

export default FormControlGroup;
