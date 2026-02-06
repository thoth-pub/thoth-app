'use client';

import EditIcon from '@mui/icons-material/Edit';

import { mergeStyles } from '@/src/shared/utils';

import AddButton from '../../core/AddButton/AddButton';

type FormEditButtonProps = {
  disabled?: boolean;
  isEmpty: boolean;
  placeholder: string;
  className?: string;
  onEdit?: () => void;
};

const FormEditButton = ({ isEmpty, placeholder, disabled, className, onEdit }: FormEditButtonProps) => {
  if (isEmpty) {
    return (
      <AddButton onAdd={onEdit} className={mergeStyles('capitalize', className)} disabled={disabled}>
        {placeholder.toLowerCase()}
      </AddButton>
    );
  }

  return <AddButton onAdd={onEdit} StartIcon={EditIcon} disabled={disabled} className={className} />;
};

export default FormEditButton;
