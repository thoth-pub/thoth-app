'use client';

import { WorkContribution } from '@/src/entities/work/model/work.types';
import { Table, TableBody, TableHeader } from '@/src/shared/ui';
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ContributionsTableRow } from './ContributionsTableRow';

type ContributionsTableProps = {
  contributions: WorkContribution[];
  activeContribution?: WorkContribution;
  form?: React.ReactNode;
  showRecommendations?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectAsMain: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
};

export const ContributionsTable = (props: ContributionsTableProps) => {
  const {
    contributions,
    activeContribution,
    form,
    showRecommendations = false,
    onEdit,
    onDelete,
    onSelectAsMain,
    onDragEnd,
  } = props;

  const sensors = useSensors(useSensor(PointerSensor));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={contributions} strategy={verticalListSortingStrategy}>
        <div className="overflow-auto">
          <Table className="border-separate">
            <TableHeader
              cells={['Name', 'Type', 'Institution', 'Biography']}
              cellStyles={['min-w-[250px]', 'min-w-[120px]', 'min-w-[250px]', 'min-w-[200px]']}
            />
            <TableBody>
              {contributions.map((contribution) => (
                <ContributionsTableRow
                  key={contribution.id}
                  isEditing={activeContribution?.id === contribution.id}
                  isEditable={!activeContribution}
                  contributor={contribution}
                  form={form}
                  showRecommendations={showRecommendations}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onSelectAsMain={onSelectAsMain}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </SortableContext>
    </DndContext>
  );
};
