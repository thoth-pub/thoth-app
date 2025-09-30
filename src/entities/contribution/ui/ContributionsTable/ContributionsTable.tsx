'use client';

import { closestCenter, DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { QueryToken } from '@/src/shared';
import { Table as TableComponent, TableBody } from '@/src/shared/ui';

import { ContributionsTableHeader } from './components/ContributionsTableHeader';
import { ContributionsTableRow } from './components/ContributionsTableRow';
import { useContributionsTable } from './useContributionsTable';

type ContributionTableProps = {
  workId: WorkId;
  queryToken: QueryToken;
  form: Readonly<React.ReactNode>;
  showRecommendations: boolean;
};

const ContributionTable = (props: ContributionTableProps) => {
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
                onDelete={(id) => deleteContribution?.({ variables: { contributionId: id } })}
                onSelectAsMain={(id) => switchMainStatus(id)}
              />
            ))}
          </TableBody>
        </TableComponent>
      </SortableContext>
    </DndContext>
  );
};

export default ContributionTable;
