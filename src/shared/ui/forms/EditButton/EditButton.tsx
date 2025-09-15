'use client';

import EditIcon from '@mui/icons-material/Edit';

import AddButton from '../../core/AddButton/AddButton';

type EditButtonProps = {
  isEmpty: boolean;
  isValueHighlighted: boolean;
  placeholder: string;
  onEdit: () => void;
};

const EditButton = ({ isEmpty, isValueHighlighted, placeholder, onEdit }: EditButtonProps) => {
  if (isEmpty) {
    return (
      <AddButton onAdd={onEdit} isTextHighlighted={isValueHighlighted}>
        {placeholder.toLowerCase()}
      </AddButton>
    );
  }

  return <AddButton onAdd={onEdit} StartIcon={EditIcon} />;
};

export default EditButton;
