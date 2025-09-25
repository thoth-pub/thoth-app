'use client';

import EditIcon from '@mui/icons-material/Edit';

import { mergeStyles } from '@/src/shared/utils';

import AddButton from '../../core/AddButton/AddButton';

type EditButtonProps = {
  disabled?: boolean;
  isEmpty: boolean;
  placeholder: string;
  className?: string;
  onEdit: () => void;
};

const EditButton = ({ isEmpty, placeholder, disabled, className, onEdit }: EditButtonProps) => {
  if (isEmpty) {
    return (
      <AddButton onAdd={onEdit} className={mergeStyles('capitalize', className)} disabled={disabled}>
        {placeholder.toLowerCase()}
      </AddButton>
    );
  }

  return <AddButton onAdd={onEdit} StartIcon={EditIcon} disabled={disabled} className={className} />;
};

export default EditButton;
