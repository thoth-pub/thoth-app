'use client';

import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { WorkEntity } from '@/src/entities/work/model/work.types';
import { useSortable } from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';
import {
  ButtonGroup,
  Checkbox,
  DeleteButton,
  EditButton,
  IconButton,
  TableCell,
  TableRow,
  Typography,
} from '@/src/shared/ui';

type TableRowProps = {
  chapter: WorkEntity;
  selected: boolean;
  onEdit?: (id: string) => void;
  onCopy?: (id: string) => void;
  onSelect?: (id: string) => void;
  onDeselect?: (id: string) => void;
};

export const ChapterTableRow = (props: TableRowProps) => {
  const { chapter, selected, onEdit, onCopy, onSelect, onDeselect } = props;

  const { id, title, pageCount, contributions } = chapter;

  const { attributes, listeners, transform, transition, setNodeRef } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const mainContributor = contributions.find((contribution) => contribution.isMain);

  const handleSelect = () => {
    if (selected) {
      onDeselect?.(id);
      return;
    }
    onSelect?.(id);
  };

  return (
    <TableRow ref={setNodeRef} style={style} onDoubleClick={() => onEdit?.(id)} className="group" {...attributes}>
      <TableCell className="rounded-tl-2xl rounded-bl-2xl border-1 border-r-0 border-transparent pl-7 capitalize group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)] group-hover:border-l-[var(--color-form-border)]">
        <div className="flex items-center gap-2">
          <DragIndicatorIcon
            {...listeners}
            className="my-auto opacity-0 group-hover:opacity-100"
            color="primary"
            fontSize="small"
          />
          <Typography>{title}</Typography>
        </div>
      </TableCell>
      <TableCell className="border-1 border-r-0 border-l-0 border-transparent capitalize group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
        <Typography>{mainContributor?.fullName ?? ''}</Typography>
      </TableCell>
      <TableCell className="rounded-tr-2xl rounded-br-2xl border-1 border-l-0 border-transparent group-hover:border-t-[var(--color-form-border)] group-hover:border-r-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
        <div className="flex justify-between">
          <Typography>{pageCount}</Typography>
          <ButtonGroup className="mb-auto ml-auto">
            <DeleteButton className="opacity-0 group-hover:opacity-100" />
            <EditButton className="opacity-0 group-hover:opacity-100" onClick={() => onEdit?.(id)} />
            <IconButton className="opacity-0 group-hover:opacity-100" onClick={() => onCopy?.(id)}>
              <ContentCopyIcon />
            </IconButton>
          </ButtonGroup>
          <Checkbox size="small" sx={{ paddingTop: '6px' }} checked={selected} onChange={handleSelect} />
        </div>
      </TableCell>
    </TableRow>
  );
};
