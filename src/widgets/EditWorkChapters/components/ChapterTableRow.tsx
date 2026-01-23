'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { WorkEntity } from '@/src/entities/work/model/work.types';
import { appConfig, getMainTitle, getPagesPlaceholder } from '@/src/shared';
import {
  ButtonGroup,
  Checkbox,
  DeleteButton,
  DragAndDropListener,
  DraggableComponent,
  EditButton,
  IconButton,
  MarkdownRenderer,
  TableCell,
  TableRow,
} from '@/src/shared/ui';

type TableRowProps = {
  chapter: WorkEntity;
  selected: boolean;
  isButtonsDisabled: boolean;
  totalChaptersCount: number;
  onEdit?: (id: string) => void;
  onCopy?: (id: string) => void;
  onSelect?: (id: string) => void;
  onDeselect?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export const ChapterTableRow = (props: TableRowProps) => {
  const {
    chapter,
    selected,
    isButtonsDisabled = false,
    totalChaptersCount,
    onEdit,
    onCopy,
    onSelect,
    onDeselect,
    onDelete,
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
    <DraggableComponent id={id}>
      {({ attributes, listeners, style, ref }) => (
        <TableRow ref={ref} style={style} onDoubleClick={() => onEdit?.(id)} className="group" {...attributes}>
          <TableCell className="firstCell">
            <div className="flex items-center gap-1 group-hover:gap-2">
              <DragAndDropListener
                isDisabled={totalChaptersCount < appConfig.minItemsCountForDragAndDrop}
                listeners={listeners}
              />
              <MarkdownRenderer markdown={getMainTitle(titles).title} />
            </div>
          </TableCell>
          <TableCell className="middleCell">
            {contributions.map((contribution) => contribution.fullName).join(', ') ?? ''}
          </TableCell>
          <TableCell className="lastCell">
            <div className="flex justify-between">
              {getPagesPlaceholder(firstPage, lastPage, pageCount)}
              <ButtonGroup className="mb-auto ml-auto" disabled={isButtonsDisabled}>
                <DeleteButton className="opacity-0 group-hover:opacity-100" onClick={() => onDelete?.(id)} />
                <EditButton className="opacity-0 group-hover:opacity-100" onClick={() => onEdit?.(id)} />
                <IconButton className="opacity-0 group-hover:opacity-100" onClick={() => onCopy?.(id)}>
                  <ContentCopyIcon />
                </IconButton>
              </ButtonGroup>
              <Checkbox size="small" sx={{ paddingTop: '6px' }} checked={selected} onChange={handleSelect} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </DraggableComponent>
  );
};
