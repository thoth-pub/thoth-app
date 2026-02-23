import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import BookIcon from '@mui/icons-material/Book';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

import { WorkEntity } from '@/src/entities/work/model/work.types';
import { getMainTitle, getPagesPlaceholder } from '@/src/shared';
import {
  ButtonGroup,
  CardListItem,
  Checkbox,
  DeleteButton,
  EditButton,
  IconButton,
  MarkdownRenderer,
  Typography,
} from '@/src/shared/ui';

type ChaptersListItemProps = {
  chapter: WorkEntity;
  draggable?: boolean;
  selected?: boolean;
  disableControls?: boolean;
  onSelect?: (id: string) => void;
  onDeselect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onCopy?: (id: string) => void;
};

const actionsClassName = 'opacity-0 group-hover:opacity-100';

export const ChaptersListItem = (props: ChaptersListItemProps) => {
  const {
    chapter,
    draggable = false,
    selected = false,
    disableControls = false,
    onSelect,
    onDeselect,
    onDelete,
    onEdit,
    onCopy,
  } = props;

  const { id, titles, pageCount, contributions, firstPage, lastPage } = chapter;

  const handleSelect = () => {
    if (selected) {
      onDeselect?.(id);
      return;
    }
    onSelect?.(id);
  };

  return (
    <CardListItem
      id={id}
      draggable={draggable}
      actionsClassName="opacity-100"
      actions={
        <ButtonGroup>
          <Checkbox
            size="small"
            className="pt-[6px]"
            checked={selected}
            disabled={disableControls}
            onChange={handleSelect}
          />
          <IconButton onClick={() => onCopy?.(id)} disabled={disableControls} className={actionsClassName}>
            <ContentCopyIcon />
          </IconButton>
          <EditButton onClick={() => onEdit?.(id)} disabled={disableControls} className={actionsClassName} />
          <DeleteButton onClick={() => onDelete?.(id)} className={actionsClassName} />
        </ButtonGroup>
      }
    >
      <Typography variant="h2" className="cardItem normal-case">
        <BookIcon fontSize="small" color="primary" />
        <MarkdownRenderer markdown={getMainTitle(titles).title} />
      </Typography>
      {contributions.length > 0 && (
        <ul>
          {contributions.map((contribution) => (
            <Typography key={contribution.id} component="li" className="cardItem">
              <PersonOutlineIcon fontSize="small" color="primary" />
              {contribution.fullName}
            </Typography>
          ))}
        </ul>
      )}
      {pageCount > 0 && (
        <Typography className="cardItem">
          <AutoStoriesIcon fontSize="small" color="primary" />
          {getPagesPlaceholder(firstPage, lastPage, pageCount, '', '')}
        </Typography>
      )}
    </CardListItem>
  );
};
