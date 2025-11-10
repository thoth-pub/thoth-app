import { ButtonGroup, DeleteButton, EditButton, FavoriteButton } from '@/src/shared/ui';

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
      <DeleteButton onClick={onDelete} className="opacity-0 group-hover:opacity-100" />
      <FavoriteButton isFavorite={isSelected} onClick={onSelectAsMain} />
      <EditButton onClick={onEdit} className="opacity-0 group-hover:opacity-100" disabled={isDisabled} />
    </ButtonGroup>
  );
};
