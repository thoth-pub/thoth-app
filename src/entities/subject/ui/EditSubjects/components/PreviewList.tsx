'use client';

import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';

import type { SubjectEntity, SubjectId } from '../../../model/subject.types';
import ListItem from './ListItem';
import { Typography } from '@/src/shared/ui';

type PreviewListProps = {
  subjects: SubjectEntity[];
  onReorderEnd?: (subjects: SubjectEntity[]) => void;
  onDelete?: (id: SubjectId) => void;
};

export const PreviewList = ({ subjects, onDelete }: PreviewListProps) => {
  const [items, setItems] = useState(subjects);
  const sensors = useSensors(useSensor(PointerSensor));

  const firstSubject = items[0];

  useEffect(() => {
    setItems(subjects);
  }, [subjects]);

  const dragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // onReorderEnd?.(newItems);

        return newItems;
      });
    }
  };

  const handleDelete = (id: SubjectId) => {
    const newItems = items.filter((item) => item.id !== id);
    setItems(newItems);

    onDelete?.(id);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {firstSubject && <Typography className="ml-2 max-w-max font-bold">{firstSubject.type}</Typography>}
        {items.map((subject, index) => (
          <ListItem key={`${subject.id}-${index}`} subject={subject} onDelete={handleDelete} />
        ))}
      </SortableContext>
    </DndContext>
  );
};
