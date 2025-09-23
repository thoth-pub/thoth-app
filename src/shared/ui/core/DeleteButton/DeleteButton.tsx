'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { IconButton } from '@/src/shared/ui';

type DeleteButtonProps = {
  onDelete: () => void;
};

const DeleteButton = ({ onDelete }: DeleteButtonProps) => {
  return (
    <IconButton onClick={onDelete}>
      <DeleteOutlineIcon />
    </IconButton>
  );
};

export default DeleteButton;
