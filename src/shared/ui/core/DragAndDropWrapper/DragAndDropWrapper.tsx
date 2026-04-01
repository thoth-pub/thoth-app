'use client';

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';

export type DragAndDropWrapperProps<T extends { id: UniqueIdentifier }> = {
  items: T[];
  onDragStart?: () => void;
  onDragEnd?: (data: T[]) => void;
  children: (isDragStarted?: boolean) => Readonly<React.ReactNode>;
};

const DragAndDropWrapper = <T extends { id: UniqueIdentifier }>(props: DragAndDropWrapperProps<T>) => {
  const { items, children, onDragStart, onDragEnd } = props;

  const [isDragStarted, setIsDragStarted] = useState(false);

  const handleDragStart = () => {
    setIsDragStarted(true);
    onDragStart?.();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);

    onDragEnd?.(newItems);
    setIsDragStarted(false);
  };

  const sensors = useSensors(useSensor(PointerSensor));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children(isDragStarted)}
      </SortableContext>
    </DndContext>
  );
};

export default DragAndDropWrapper;
