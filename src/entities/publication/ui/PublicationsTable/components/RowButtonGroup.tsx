import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';

import { ButtonGroup, IconButton } from '@/src/shared/ui';

type RowButtonGroupProps = {
  isDisabled?: boolean;
  className?: string;
  onDelete?: () => void;
  onEdit?: () => void;
};
export const RowButtonGroup = (props: RowButtonGroupProps) => {
  const { className, isDisabled = false, onDelete, onEdit } = props;

  return (
    <ButtonGroup className={className}>
      <IconButton onClick={onDelete} className="opacity-0 group-hover:opacity-100">
        <DeleteOutlineIcon />
      </IconButton>
      <IconButton onClick={onEdit} className="opacity-0 group-hover:opacity-100" disabled={isDisabled}>
        <EditIcon />
      </IconButton>
    </ButtonGroup>
  );
};
