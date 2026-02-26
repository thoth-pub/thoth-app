import UpdateIcon from '@mui/icons-material/Update';

import BooksChip from '@/src/features/books/BooksChip/BooksChip';
import { convertUpdatedAtToFormattedDate, getMainTitle } from '@/src/shared';
import { CardListItem, DeleteButton, LandingPagesGallery, MarkdownRenderer, Typography } from '@/src/shared/ui';

import { SetEntity } from '../../..';

type SetsListCardItemProps = {
  set: SetEntity;
  editing?: boolean;
  disabledControls?: boolean;
  form?: Readonly<React.ReactNode>;
  onEdit?: (set: SetEntity) => void;
  onDelete?: (id: string) => void;
};

export const SetsListCardItem = (props: SetsListCardItemProps) => {
  const { set, editing = false, disabledControls = false, form, onEdit, onDelete } = props;

  const { id, titles, type, updatedAt, imprintId, status, edition, volumesCount, covers } = set;

  const handleEdit = () => {
    if (!onEdit) return;

    onEdit({ id, titles, type, updatedAt, imprintId, status, edition, volumesCount, covers });
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
      actions={<DeleteButton onClick={() => onDelete?.(set.id)} />}
    >
      <div className="cardWithImageWrapper">
        <LandingPagesGallery images={covers} />
        <Typography variant="h2" className="cardItem normal-case flex flex-col gap-1 items-start">
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
