'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import { Chip, DeleteButton, Typography } from '@/src/shared/ui';

import type { SubjectEntity, SubjectId } from '../../../model/subject.types';
import {
  convertBicSubjectCodeToReadableFormat,
  convertBisacSubjectCodeToReadableFormat,
  convertThemaSubjectCodeToReadableFormat,
  SubjectTypes,
} from '@/src/shared';

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

  const isBisac = subject.type === SubjectTypes.enum.Bisac;
  const isBic = subject.type === SubjectTypes.enum.Bic;
  const isThema = subject.type === SubjectTypes.enum.Thema;

  const isDefault = !isBisac && !isBic && !isThema;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-1 rounded-xl border-1 border-transparent p-2 group-hover:bg-[var(--color-form-background)] hover:border-[var(--color-form-border)]"
      {...attributes}
    >
      <DragIndicatorIcon
        className="my-auto opacity-0 group-hover:opacity-100"
        color="primary"
        fontSize="small"
        {...listeners}
      />
      <Typography>
        <Chip label={subject.type} size="small" component="span" className="mr-2" />
        {isDefault && subject.code}
        {isBisac && convertBisacSubjectCodeToReadableFormat(subject.code)}
        {isBic && convertBicSubjectCodeToReadableFormat(subject.code)}
        {isThema && convertThemaSubjectCodeToReadableFormat(subject.code)}
      </Typography>
      <DeleteButton className="ml-auto opacity-0 group-hover:opacity-100" onClick={() => onDelete?.(id)} />
    </li>
  );
};

export default ListItem;
