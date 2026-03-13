import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LinkIcon from '@mui/icons-material/Link';

import { CardListItem, DeleteButton, LinkTooltip, Typography } from '@/src/shared/ui';

import { AwardEntity } from '../../../model/award.types';

type AwardCardListItemProps = {
  award: AwardEntity;
  draggable?: boolean;
  editing: boolean;
  form?: Readonly<React.ReactNode>;
  editDisabled?: boolean;
  deleteLoading?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export const AwardCardListItem = (props: AwardCardListItemProps) => {
  const { award, draggable, editing, form, editDisabled = false, deleteLoading = false, onDelete, onEdit } = props;

  const { id, title, category, url } = award;

  return (
    <CardListItem
      id={id}
      draggable={draggable}
      editing={editing}
      form={form}
      editDisabled={editDisabled}
      onEdit={() => onEdit?.(id)}
      ariaLabel="Edit award"
      actions={<DeleteButton onClick={() => onDelete?.(id)} disabled={deleteLoading} />}
    >
      {title.length > 0 && (
        <Typography className="cardItem normal-case">
          <EmojiEventsIcon fontSize="small" color="primary" />
          {title} {category.length > 0 && `(${category})`}{' '}
          {url.length > 0 && (
            <LinkTooltip link={url} linkText={url}>
              <LinkIcon fontSize="small" color="primary" />
            </LinkTooltip>
          )}
        </Typography>
      )}
    </CardListItem>
  );
};
