'use client';

import { closestCenter, DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { type BaseEditSectionProps } from '@/src/shared';
import { Table as TableComponent, TableBody } from '@/src/shared/ui';

import { ContributionsTableHeader } from './components/ContributionsTableHeader';
import { ContributionsTableRow } from './components/ContributionsTableRow';
import { useContributionsTable } from './useContributionsTable';

type ContributionsTableProps = BaseEditSectionProps & {
  form: Readonly<React.ReactNode>;
  showRecommendations: boolean;
};

const ContributionsTable = (props: ContributionsTableProps) => {
  const { workId, queryToken, form, showRecommendations } = props;

  const {
    contributions,
    activeContribution,
    sensors,
    dragEnd,
    editContribution,
    deleteContribution,
    switchMainStatus,
  } = useContributionsTable({
    workId,
    queryToken,
  });

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
      <SortableContext items={contributions} strategy={verticalListSortingStrategy}>
        <TableComponent>
          <ContributionsTableHeader cells={['Name', 'Type', 'Institution', 'Biography']} />
          <TableBody>
            {contributions.map((contribution) => (
              <ContributionsTableRow
                key={contribution.id}
                isEditing={activeContribution?.id === contribution.id}
                isEditable={!activeContribution}
                contributor={contribution}
                form={form}
                showRecommendations={showRecommendations}
                onEdit={(id) => editContribution(id)}
                onDelete={(id) => deleteContribution?.(id)}
                onSelectAsMain={(id) => switchMainStatus(id)}
              />
            ))}
          </TableBody>
        </TableComponent>
      </SortableContext>
    </DndContext>
  );
};

export default ContributionsTable;
