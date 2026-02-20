import UpdateIcon from '@mui/icons-material/Update';

import { convertUpdatedAtToFormattedDate, getMainTitle } from '@/src/shared';
import { ButtonGroup, CardListItem, DeleteButton, EditButton, MarkdownRenderer, Typography } from '@/src/shared/ui';

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

  const { id, titles, type, updatedAt, imprintId, status, edition, volumesCount } = set;

  return (
    <CardListItem
      id={set.id}
      draggable={false}
      form={form}
      editing={editing}
      actions={
        <ButtonGroup>
          <EditButton
            onClick={() =>
              onEdit?.({
                id,
                titles,
                type,
                updatedAt,
                imprintId,
                status,
                edition,
                volumesCount,
              })
            }
            disabled={disabledControls}
          />
          <DeleteButton onClick={() => onDelete?.(set.id)} />
        </ButtonGroup>
      }
    >
      <Typography variant="h2" className="cardItem normal-case">
        <MarkdownRenderer markdown={getMainTitle(titles).title} />
      </Typography>
      <Typography className="cardItem">
        <UpdateIcon fontSize="small" color="primary" />
        {convertUpdatedAtToFormattedDate(updatedAt)}
      </Typography>
    </CardListItem>
  );
};
