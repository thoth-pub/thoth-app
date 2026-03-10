import UpdateIcon from '@mui/icons-material/Update';

import BooksChip from '@/src/features/books/BooksChip/BooksChip';
import { CardListItem, DeleteButton, LandingPagesGallery, MarkdownRenderer, Typography } from '@/src/shared/ui';
import { convertUpdatedAtToFormattedDate, getMainTitle } from '@/src/shared/utils';

import { SetEntity } from '../../..';

type SetsListCardItemProps = {
  set: SetEntity;
  editing?: boolean;
  disabledControls?: boolean;
  form?: Readonly<React.ReactNode>;
  deleteLoading?: boolean;
  onEdit?: (set: SetEntity) => void;
  onDelete?: (id: string) => void;
};

export const SetsListCardItem = (props: SetsListCardItemProps) => {
  const { set, editing = false, disabledControls = false, form, deleteLoading = false, onEdit, onDelete } = props;

  const { titles, updatedAt, volumesCount, covers } = set;

  const handleEdit = () => {
    if (!onEdit) return;

    onEdit(set);
  };

  return (
    <CardListItem
      id={set.id}
      draggable={false}
      form={form}
      editing={editing}
      editDisabled={disabledControls}
      onEdit={handleEdit}
      ariaLabel="Edit set"
      actions={<DeleteButton onClick={() => onDelete?.(set.id)} disabled={deleteLoading} />}
    >
      <div className="cardWithImageWrapper">
        <LandingPagesGallery images={covers} />
        <Typography variant="h2" className="cardItem flex flex-col items-start gap-1 normal-case">
          <MarkdownRenderer markdown={getMainTitle(titles).title} />
          <BooksChip booksCount={volumesCount} />
        </Typography>
      </div>
      <Typography className="cardItem">
        <UpdateIcon fontSize="small" color="primary" />
        {convertUpdatedAtToFormattedDate(updatedAt)}
      </Typography>
    </CardListItem>
  );
};
