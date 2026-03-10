import { ButtonGroup, DeleteButton, EditButton } from '@/src/shared/ui';

type RowButtonGroupProps = {
  isDisabled: boolean;
  deleteLoading?: boolean;
  className?: string;
  onDelete?: () => void;
  onEdit?: () => void;
};
export const RowButtonGroup = (props: RowButtonGroupProps) => {
  const { className, isDisabled = false, deleteLoading = false, onDelete, onEdit } = props;

  return (
    <ButtonGroup className={className}>
      <DeleteButton onClick={onDelete} className="opacity-0 group-hover:opacity-100" disabled={deleteLoading} />
      <EditButton onClick={onEdit} className="opacity-0 group-hover:opacity-100" disabled={isDisabled} />
    </ButtonGroup>
  );
};
