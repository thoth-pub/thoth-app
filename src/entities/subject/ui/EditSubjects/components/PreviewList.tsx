'use client';

import { DragAndDropWrapper, Typography } from '@/src/shared/ui';

import type { SubjectEntity, SubjectId } from '../../../model/subject.types';
import ListItem from './ListItem';

type PreviewListProps = {
  subjects: SubjectEntity[];
  onDragEnd?: (subjects: SubjectEntity[]) => void;
  onDelete?: (id: SubjectId) => void;
};

export const PreviewList = ({ subjects, onDelete, onDragEnd }: PreviewListProps) => {
  const firstSubject = subjects[0];

  return (
    <DragAndDropWrapper items={subjects} onDragEnd={onDragEnd}>
      {() => (
        <>
          {firstSubject && <Typography className="ml-2 max-w-max font-bold">{firstSubject.type}</Typography>}
          {subjects.map((subject, index) => (
            <ListItem
              key={`${subject.id}-${index}`}
              subject={subject}
              totalSubjectsCount={subjects.length}
              onDelete={onDelete}
            />
          ))}
        </>
      )}
    </DragAndDropWrapper>
  );
};
