'use client';

import EditIcon from '@mui/icons-material/Edit';

import AddButton from '../../core/AddButton/AddButton';

type EditButtonProps = {
  disabled?: boolean;
  isEmpty: boolean;
  placeholder: string;
  onEdit: () => void;
};

const EditButton = ({ isEmpty, placeholder, disabled, onEdit }: EditButtonProps) => {
  if (isEmpty) {
    return (
      <AddButton onAdd={onEdit} className="capitalize" disabled={disabled}>
        {placeholder.toLowerCase()}
      </AddButton>
    );
  }

  return <AddButton onAdd={onEdit} StartIcon={EditIcon} disabled={disabled} />;
};

export default EditButton;
