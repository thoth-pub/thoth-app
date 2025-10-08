'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import IconButton, { type IconButtonProps } from '../IconButton/IconButton';

const DeleteButton = (props: IconButtonProps) => {
  return (
    <IconButton {...props}>
      <DeleteOutlineIcon />
    </IconButton>
  );
};

export default DeleteButton;
