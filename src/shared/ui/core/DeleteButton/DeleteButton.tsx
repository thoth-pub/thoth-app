'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { IconButton } from '@/src/shared/ui';

type DeleteButtonProps = {
  className?: string;
  onDelete: () => void;
};

const DeleteButton = ({ className, onDelete }: DeleteButtonProps) => {
  return (
    <IconButton onClick={onDelete} className={className}>
      <DeleteOutlineIcon />
    </IconButton>
  );
};

export default DeleteButton;
