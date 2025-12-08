'use client';

import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import {
  convertBicSubjectCodeToReadableFormat,
  convertBisacSubjectCodeToReadableFormat,
  convertThemaSubjectCodeToReadableFormat,
  SubjectTypes,
} from '@/src/shared';
import { Chip, DeleteButton, DraggableComponent, Typography } from '@/src/shared/ui';

import type { SubjectEntity, SubjectId } from '../../../model/subject.types';

type ListItemProps = {
  subject: SubjectEntity;
  isDragDisabled?: boolean;
  onDelete?: (id: SubjectId) => void;
};

const ListItem = ({ subject, isDragDisabled = false, onDelete }: ListItemProps) => {
  const { id } = subject;

  const isBisac = subject.type === SubjectTypes.enum.Bisac;
  const isBic = subject.type === SubjectTypes.enum.Bic;
  const isThema = subject.type === SubjectTypes.enum.Thema;

  const isDefault = !isBisac && !isBic && !isThema;

  const showChip = subject.type !== SubjectTypes.enum.Custom && subject.type !== SubjectTypes.enum.Keyword;

  return (
    <DraggableComponent id={id}>
      {({ attributes, listeners, style, ref }) => (
        <li
          ref={ref}
          style={style}
          className="group flex items-center gap-1 rounded-xl border-1 border-transparent p-2 group-hover:bg-[var(--color-form-background)] hover:border-[var(--color-form-border)]"
          {...attributes}
        >
          <DragIndicatorIcon
            className={`my-auto ${isDragDisabled ? '!opacity-0' : 'opacity-0 group-hover:opacity-100'}`}
            color="primary"
            fontSize="small"
            {...(isDragDisabled ? undefined : listeners)}
          />
          <Typography className="flex items-center gap-1">
            {showChip && <Chip label={subject.code} size="small" component="span" />}
            {isDefault && subject.code}
            {isBisac && convertBisacSubjectCodeToReadableFormat(subject.code, false)}
            {isBic && convertBicSubjectCodeToReadableFormat(subject.code, false)}
            {isThema && convertThemaSubjectCodeToReadableFormat(subject.code, false)}
          </Typography>
          <DeleteButton className="ml-auto opacity-0 group-hover:opacity-100" onClick={() => onDelete?.(id)} />
        </li>
      )}
    </DraggableComponent>
  );
};

export default ListItem;
