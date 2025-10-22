import EditIcon from '@mui/icons-material/Edit';

import IconButton, { IconButtonProps } from '../IconButton/IconButton';

const EditButton = ({ sx, ...props }: IconButtonProps) => {
  return (
    <IconButton {...props} sx={{ height: '16px', width: '2rem', '@media (min-width: 1024px)': { height: '2rem' } }}>
      <EditIcon />
    </IconButton>
  );
};

export default EditButton;
