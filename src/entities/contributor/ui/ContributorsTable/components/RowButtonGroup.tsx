import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

import { ButtonGroup, IconButton } from '@/src/shared/ui';

type RowButtonGroupProps = {
  isSelected: boolean;
  className?: string;
  onDelete?: () => void;
  onEdit?: () => void;
  onSelectAsMain?: () => void;
};
export const RowButtonGroup = (props: RowButtonGroupProps) => {
  const { isSelected, className, onDelete, onEdit, onSelectAsMain } = props;

  return (
    <ButtonGroup className={className}>
      <IconButton onClick={onDelete} className="opacity-0">
        <DeleteOutlineIcon />
      </IconButton>
      <IconButton onClick={onEdit} className="opacity-0">
        <EditIcon />
      </IconButton>
      <IconButton onClick={onSelectAsMain}>{isSelected ? <StarIcon /> : <StarBorderIcon />}</IconButton>
    </ButtonGroup>
  );
};
