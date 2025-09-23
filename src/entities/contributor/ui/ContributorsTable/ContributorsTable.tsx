'use client';

import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';

import type { WorkContribution } from '@/src/entities/work/model/work.types';
import type { FormFieldOption } from '@/src/shared';
import { Table as TableComponent, TableBody } from '@/src/shared/ui';

import type { ContributionId, ContributionType, ContributorId } from '../../model/contributor.types';
import { ContributorsTableHeader } from './components/ContributorsTableHeader';
import { ContributorsTableRow } from './components/ContributorsTableRow';

type ContributorsTableProps = {
  data: WorkContribution[];
  contributorTypeOptions: FormFieldOption[];
  selectedId: ContributionId;
  isOrchidFieldDisabled?: boolean;
  isWebsiteUrlFieldDisabled?: boolean;
  onDelete?: (id: ContributorId) => void;
  onCloseEdit?: () => void;
  onEdit?: (id: ContributionId) => void;
  onFullNameUpdate?: (fullName: string) => void;
  onLastNameUpdate?: (lastName: string) => void;
  onBiographyUpdate?: (biography: string) => void;
  onOrcidUpdate?: (orcid: string) => void;
  onWebsiteUrlUpdate?: (websiteUrl: string) => void;
  onContributorTypeUpdate?: (contributorType: ContributionType) => void;
  onSelectAsMain?: (id: ContributionId) => void;
  onReorderEnd?: (items: WorkContribution[]) => void;
};

const ContributorsTable = (props: ContributorsTableProps) => {
  const {
    data,
    contributorTypeOptions,
    selectedId,
    isOrchidFieldDisabled = false,
    isWebsiteUrlFieldDisabled = false,
    onDelete,
    onFullNameUpdate,
    onLastNameUpdate,
    onBiographyUpdate,
    onOrcidUpdate,
    onWebsiteUrlUpdate,
    onContributorTypeUpdate,
    onCloseEdit,
    onEdit,
    onSelectAsMain,
    onReorderEnd,
  } = props;

  const [items, setItems] = useState(data);
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    setItems(data);
  }, [data]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        onReorderEnd?.(newItems);

        return newItems;
      });
    }
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
                isEditing={selectedId === item.id}
                contributor={item}
                contributorTypeOptions={contributorTypeOptions}
                isOrchidFieldDisabled={isOrchidFieldDisabled}
                isWebsiteUrlFieldDisabled={isWebsiteUrlFieldDisabled}
                onCloseEdit={onCloseEdit}
                onEdit={(id) => onEdit?.(id)}
                onDelete={(id) => onDelete?.(id)}
                onFullNameUpdate={(fullName) => onFullNameUpdate?.(fullName)}
                onLastNameUpdate={(lastName) => onLastNameUpdate?.(lastName)}
                onBiographyUpdate={(biography) => onBiographyUpdate?.(biography)}
                onOrcidUpdate={(orcid) => onOrcidUpdate?.(orcid)}
                onWebsiteUrlUpdate={(websiteUrl) => onWebsiteUrlUpdate?.(websiteUrl)}
                onContributorTypeUpdate={(contributorType) => onContributorTypeUpdate?.(contributorType)}
                onSelectAsMain={(id) => onSelectAsMain?.(id)}
              />
            ))}
          </TableBody>
        </TableComponent>
      </SortableContext>
    </DndContext>
  );
};

export default ContributorsTable;
