'use client';

import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';

import { useContributionStateMachine } from '@/src/entities/contribution';
import type { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import { useWork } from '@/src/entities/work';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { QueryToken } from '@/src/shared';
import { Table as TableComponent, TableBody } from '@/src/shared/ui';

import { ContributorsTableHeader } from './components/ContributorsTableHeader';
import { ContributorsTableRow } from './components/ContributorsTableRow';

type ContributionTableProps = {
  workId: WorkId;
  queryToken: QueryToken;
  form: Readonly<React.ReactNode>;
  showRecommendations: boolean;
};

const ContributionTable = (props: ContributionTableProps) => {
  const { workId, queryToken, form, showRecommendations } = props;

  const { work } = useWork(workId, queryToken);

  const { activeContribution, edit } = useContributionStateMachine();
  const [items, setItems] = useState(work.contributions);
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    setItems(work.contributions);
  }, [activeContribution]);

  const handleDragEnd = (event: DragEndEvent) => {
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

  const handleEdit = (id: ContributionId) => {
    const contribution = items.find((contribution) => contribution.id === id);

    if (!contribution) return;

    edit(contribution);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <TableComponent>
          <ContributorsTableHeader cells={['Name', 'Type', 'Institution', 'Biography']} />
          <TableBody>
            {items.map((item) => (
              <ContributorsTableRow
                key={item.id}
                isEditing={activeContribution?.id === item.id}
                isEditable={!activeContribution}
                contributor={item}
                form={form}
                showRecommendations={showRecommendations}
                onEdit={(id) => handleEdit(id)}
                // onDelete={(id) => onDelete?.(id)}
                // onSelectAsMain={(id) => onSelectAsMain?.(id)}
              />
            ))}
          </TableBody>
        </TableComponent>
      </SortableContext>
    </DndContext>
  );
};

export default ContributionTable;
