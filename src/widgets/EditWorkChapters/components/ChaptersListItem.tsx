import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { ContributorsChip } from '@/src/entities/contributor/ui';
import { WorkEntity } from '@/src/entities/work/model/work.types';
import {
  ButtonGroup,
  CardListItem,
  Checkbox,
  DeleteButton,
  DoiPreview,
  IconButton,
  MarkdownRenderer,
  Typography,
} from '@/src/shared/ui';
import { getMainTitle, getPagesPlaceholder } from '@/src/shared/utils';

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

  const actionsClassName = `opacity-0 ${!disableControls && 'group-hover:opacity-100'}`;

  const { id, titles, pageCount, contributions, firstPage, lastPage, doi, landingPage } = chapter;

  const contributorsNames = contributions.map((contribution) => contribution.fullName);

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
      editDisabled={disableControls}
      onEdit={() => onEdit?.(id)}
      ariaLabel="Edit chapter"
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
          <DeleteButton onClick={() => onDelete?.(id)} className={actionsClassName} />
        </ButtonGroup>
      }
    >
      <Typography variant="h2" className="cardItem normal-case">
        <MarkdownRenderer markdown={getMainTitle(titles).title} />
      </Typography>

      <ContributorsChip contributors={contributorsNames} />

      {pageCount > 0 && (
        <Typography className="cardItem">
          <AutoStoriesIcon fontSize="small" color="primary" />
          {getPagesPlaceholder(firstPage, lastPage, pageCount, '', '')}
        </Typography>
      )}

      {doi.length > 0 && <DoiPreview doi={doi} landingPage={landingPage ?? ''} />}
    </CardListItem>
  );
};
