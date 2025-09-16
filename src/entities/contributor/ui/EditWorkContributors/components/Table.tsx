import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';

import { Table as TableComponent, TableBody } from '@/src/shared/ui';

import { Row } from './Row';
import { TableFooter } from './TableFooter';
import { TableHeader } from './TableHeader';

type TableProps = {
  data: {
    id: string;
    name: string;
    type: string;
    institution: string;
    bio: string;
    rorId?: string;
    orchidId?: string;
  }[];
  selectedContributor: string;
  onEdit?: (contributor: string) => void;
  onCloseEdit?: () => void;
  onDelete?: (contributor: string) => void;
  onSelectAsMain?: (contributor: string) => void;
};

export const Table = ({ data, selectedContributor, onEdit, onCloseEdit, onDelete, onSelectAsMain }: TableProps) => {
  const [items, setItems] = useState(data);
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <TableComponent>
          <TableHeader cells={['Name', 'Type', 'Institution', 'Bio']} />
          <TableBody>
            {items.map((item) => (
              <Row
                key={item.name}
                isEditing={selectedContributor === item.name}
                mainContributor={items[0].name}
                item={item}
                onCloseEdit={() => onCloseEdit?.()}
                onEdit={(name) => onEdit?.(name)}
                onDelete={(name) => onDelete?.(name)}
                onSelectAsMain={(name) => onSelectAsMain?.(name)}
              />
            ))}
          </TableBody>
          <TableFooter />
        </TableComponent>
      </SortableContext>
    </DndContext>
  );
};
