'use client';

import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';

import { Chip } from '@/src/shared/ui';

import type { SubjectEntity, SubjectId, SubjectType } from '../../../model/subject.types';
import ListItem from './ListItem';

type PreviewListProps = {
  title: SubjectType;
  subjects: SubjectEntity[];
  onReorderEnd?: (subjects: SubjectEntity[]) => void;
  onDelete?: (id: SubjectId) => void;
};

export const PreviewList = ({ subjects, title, onDelete }: PreviewListProps) => {
  const [items, setItems] = useState(subjects);
  const sensors = useSensors(useSensor(PointerSensor));

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
        <Chip label={title} size="small" component="li" className="m-auto max-w-max" />
        {items.map((subject) => (
          <ListItem key={subject.id} subject={subject} onDelete={handleDelete} />
        ))}
      </SortableContext>
    </DndContext>
  );
};
