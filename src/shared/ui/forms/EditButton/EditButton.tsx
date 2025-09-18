'use client';

import EditIcon from '@mui/icons-material/Edit';

import AddButton from '../../core/AddButton/AddButton';

type EditButtonProps = {
  isEmpty: boolean;
  placeholder: string;
  onEdit: () => void;
};

const EditButton = ({ isEmpty, placeholder, onEdit }: EditButtonProps) => {
  if (isEmpty) {
    return <AddButton onAdd={onEdit}>{placeholder.toLowerCase()}</AddButton>;
  }

  return <AddButton onAdd={onEdit} StartIcon={EditIcon} />;
};

export default EditButton;
