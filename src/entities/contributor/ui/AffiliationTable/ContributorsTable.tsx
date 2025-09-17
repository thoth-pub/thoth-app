'use client';

import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';

import type { WorkContribution } from '@/src/entities/work/model/work.types';
import { Table as TableComponent, TableBody } from '@/src/shared/ui';

import type { ContributorId } from '../../model/contributor.types';
import { ContributorsTableHeader } from './components/ContributorsTableHeader';
import { ContributorsTableRow } from './components/ContributorsTableRow';

// const data = [
//   {
//     name: 'John Doe',
//     type: 'Author',
//     institution: 'University of California, Berkeley',
//     bio: 'John Doe is a professor of computer science at the University of California, Berkeley.',
//     rorId: 'https://ror.org/01jmxt844',
//     orchidId: 'https://orcid.org/0000-0002-9641-2530',
//     id: '1',
//   },
//   {
//     name: 'Jane Doe',
//     type: 'Editor',
//     institution: 'University of California, Berkeley',
//     bio: 'Jane Doe is a professor of computer science at the University of California, Berkeley.',
//     id: '2',
//   },
//   {
//     name: 'Jim Doe',
//     type: 'Translator',
//     institution: 'University of California, Berkeley',
//     bio: 'Jim Doe is a professor of computer science at the University of California, Berkeley.',
//     id: '3',
//   },
//   {
//     name: 'Jill Doe',
//     type: 'Illustrator',
//     institution: 'University of California, Berkeley',
//     bio: 'Jill Doe is a professor of computer science at the University of California, Berkeley.',
//     id: '4',
//   },
// ];

type ContributorsTableProps = {
  data: WorkContribution[];
};

const ContributorsTable = ({ data }: ContributorsTableProps) => {
  const [selectedContributor, setSelectedContributor] = useState<ContributorId | ''>('');
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

  const selectAsMain = (id: ContributorId) => {
    const index = items.findIndex((item) => item.id === id);

    if (index < 1) return;

    setItems((items) => {
      return arrayMove(items, index, 0);
    });
  };

  const handleCloseEdit = () => {
    setSelectedContributor('');
  };

  const handleEdit = (id: ContributorId) => {
    setSelectedContributor(id);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <TableComponent>
          <ContributorsTableHeader cells={['Name', 'Type', 'Institution', 'Bio']} />
          <TableBody>
            {items.map((item) => (
              <ContributorsTableRow
                key={item.id}
                isEditing={selectedContributor === item.id}
                item={item}
                onCloseEdit={handleCloseEdit}
                onEdit={(id) => handleEdit(id)}
                onDelete={(id) => console.log(id)}
                onSelectAsMain={(id) => setSelectedContributor(id)}
              />
            ))}
          </TableBody>
        </TableComponent>
      </SortableContext>
    </DndContext>
  );
};

export default ContributorsTable;
