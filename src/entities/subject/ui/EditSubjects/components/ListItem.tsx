'use client';

import { WorkId } from '@/src/entities/work/model/work.types';
import {
  convertBicSubjectCodeToReadableFormat,
  convertBisacSubjectCodeToReadableFormat,
  convertThemaSubjectCodeToReadableFormat,
  isDragAndDropDisabled,
  SubjectTypes,
} from '@/src/shared';
import { ButtonGroup, Chip, DeleteButton, DragAndDropListener, DraggableComponent, EditButton, Typography } from '@/src/shared/ui';

import type { SubjectEntity, SubjectId } from '../../../model/subject.types';
import { EditSubject } from '../../EditSubject/EditSubject';

type ListItemProps = {
  workId: WorkId;
  activeSubjectId: SubjectId;
  isEditDisabled: boolean;
  subject: SubjectEntity;
  totalSubjectsCount: number;
  onEdit?: (id: SubjectId) => void;
  onDelete?: (id: SubjectId) => void;
};

const ListItem = ({ workId, activeSubjectId, isEditDisabled, subject, totalSubjectsCount, onDelete, onEdit }: ListItemProps) => {
  const { id } = subject;

  const isBisac = subject.type === SubjectTypes.enum.Bisac;
  const isBic = subject.type === SubjectTypes.enum.Bic;
  const isThema = subject.type === SubjectTypes.enum.Thema;

  const isDefault = !isBisac && !isBic && !isThema;

  const showChip = subject.type !== SubjectTypes.enum.Custom && subject.type !== SubjectTypes.enum.Keyword && subject.type !== SubjectTypes.enum.Lcc;

  return (
    <>
      {activeSubjectId === id ? <EditSubject workId={workId} /> : (
        <DraggableComponent id={id}>
          {({ attributes, listeners, style, ref }) => (
            <li
              ref={ref}
              style={style}
              className="group -ml-4 flex items-center gap-1 rounded-xl border border-transparent p-2 hover:bg-(--color-form-background) hover:border-(--color-form-border)"
              {...attributes}
            >
              <DragAndDropListener isDisabled={isDragAndDropDisabled(totalSubjectsCount)} listeners={listeners} />
              <Typography className="flex items-center gap-1">
                {showChip && <Chip label={subject.code} size="small" component="span" />}
                <Typography className='ml-1' component="span">
                  {isDefault && subject.code}
                  {isBisac && convertBisacSubjectCodeToReadableFormat(subject.code, false)}
                  {isBic && convertBicSubjectCodeToReadableFormat(subject.code, false)}
                  {isThema && convertThemaSubjectCodeToReadableFormat(subject.code, false)}
                </Typography>
              </Typography>
              <ButtonGroup className="ml-auto">
                <DeleteButton className="ml-auto opacity-0 group-hover:opacity-100" onClick={() => onDelete?.(id)} />
                <EditButton className="ml-auto opacity-0 group-hover:opacity-100" disabled={isEditDisabled} onClick={() => onEdit?.(id)} />
              </ButtonGroup>
            </li>
          )}
        </DraggableComponent>)}
    </>
  );
};

export default ListItem;
