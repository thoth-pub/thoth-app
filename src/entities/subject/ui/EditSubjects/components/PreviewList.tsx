'use client';

import { WorkId } from '@/src/entities/work/model/work.types';
import { DragAndDropWrapper, Typography } from '@/src/shared/ui';

import type { SubjectEntity, SubjectId } from '../../../model/subject.types';
import ListItem from './ListItem';

type PreviewListProps = {
  workId: WorkId;
  activeSubjectId: SubjectId;
  isEditDisabled: boolean;
  subjects: SubjectEntity[];
  deleteLoading?: boolean;
  onDragEnd?: (subjects: SubjectEntity[]) => void;
  onDelete?: (id: SubjectId) => void;
  onEdit?: (id: SubjectId) => void;
};

export const PreviewList = ({
  workId,
  activeSubjectId,
  isEditDisabled,
  subjects,
  deleteLoading,
  onDelete,
  onDragEnd,
  onEdit,
}: PreviewListProps) => {
  const firstSubject = subjects[0];

  return (
    <DragAndDropWrapper items={subjects} onDragEnd={onDragEnd}>
      {() => (
        <>
          {firstSubject && <Typography className="max-w-max font-bold">{firstSubject.type}</Typography>}
          {subjects.map((subject, index) => (
            <ListItem
              className={index === subjects.length - 1 ? 'mb-6' : ''}
              key={subject.id}
              workId={workId}
              activeSubjectId={activeSubjectId}
              isEditDisabled={isEditDisabled}
              subject={subject}
              totalSubjectsCount={subjects.length}
              deleteLoading={deleteLoading}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </>
      )}
    </DragAndDropWrapper>
  );
};
