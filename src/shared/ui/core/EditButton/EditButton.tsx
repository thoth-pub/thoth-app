import EditIcon from '@mui/icons-material/Edit';

import IconButton, { IconButtonProps } from '../IconButton/IconButton';

const EditButton = (props: IconButtonProps) => {
  return (
    <IconButton {...props}>
      <EditIcon />
    </IconButton>
  );
};

export default EditButton;
