import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

import { ButtonGroup, IconButton } from '@/src/shared/ui';

type RowButtonGroupProps = {
  isSelected: boolean;
  isDisabled: boolean;
  className?: string;
  onDelete?: () => void;
  onEdit?: () => void;
  onSelectAsMain?: () => void;
};
export const RowButtonGroup = (props: RowButtonGroupProps) => {
  const { isSelected, className, isDisabled = false, onDelete, onEdit, onSelectAsMain } = props;

  return (
    <ButtonGroup className={className}>
      <IconButton onClick={onDelete} className="opacity-0 group-hover:opacity-100">
        <DeleteOutlineIcon />
      </IconButton>
      <IconButton onClick={onEdit} className="opacity-0 group-hover:opacity-100" disabled={isDisabled}>
        <EditIcon />
      </IconButton>
      <IconButton onClick={onSelectAsMain}>{isSelected ? <StarIcon /> : <StarBorderIcon />}</IconButton>
    </ButtonGroup>
  );
};
