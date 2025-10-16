'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import { DeleteButton, Typography } from '@/src/shared/ui';

import type { SubjectEntity, SubjectId } from '../../../model/subject.types';

type ListItemProps = {
  subject: SubjectEntity;
  onDelete?: (id: SubjectId) => void;
};

const ListItem = ({ subject, onDelete }: ListItemProps) => {
  const { id } = subject;

  const { attributes, listeners, transform, transition, setNodeRef } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-1 rounded-xl border-1 border-transparent p-2 hover:border-[var(--color-form-border)]"
      {...attributes}
    >
      <DragIndicatorIcon
        className="my-auto opacity-0 group-hover:opacity-100"
        color="primary"
        fontSize="small"
        {...listeners}
      />
      <Typography>{subject.code}</Typography>
      <DeleteButton className="ml-auto opacity-0 group-hover:opacity-100" onClick={() => onDelete?.(id)} />
    </li>
  );
};

export default ListItem;
