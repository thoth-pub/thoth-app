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

type DragAndDropWrapperProps<T extends { id: UniqueIdentifier }> = {
  items: T[];
  onDragEnd?: (data: T[]) => void;
  children: Readonly<React.ReactNode>;
};

const DragAndDropWrapper = <T extends { id: UniqueIdentifier }>(props: DragAndDropWrapperProps<T>) => {
  const { items, onDragEnd, children } = props;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
  
    onDragEnd?.(newItems);
  };

  const sensors = useSensors(useSensor(PointerSensor));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
};

export default DragAndDropWrapper;
