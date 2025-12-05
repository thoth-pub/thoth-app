'use client';

import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';

import { useDeleteIssue } from '@/src/entities/series';
import type { SeriesEntity } from '@/src/entities/series/model/series.types';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { QueryToken } from '@/src/shared/interfaces';

import { ListItem } from './ListItem';

type IssuesListProps = {
  issues: SeriesEntity['issues'];
  workId?: WorkId;
  queryToken: QueryToken;
  withDelete?: boolean;
};

export const IssuesList = (props: IssuesListProps) => {
  const { queryToken, withDelete = false, issues } = props;

  const { deleteIssue } = useDeleteIssue({ queryToken });

  const sensors = useSensors(useSensor(PointerSensor));

  const [updatedIssues, setUpdatedIssues] = useState(issues);

  useEffect(() => {
    setUpdatedIssues(issues);
  }, [issues]);

  // const updateSeriesIssues = (issues: { id: string }[], seriesId: SeriesId) => {
  //   issues.forEach(({ id }, index) => {
  //     updateIssue({
  //       issueId: id,
  //       orderNumber: index + 1,
  //       seriesId,
  //       workId,
  //     });
  //   });
  // };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setUpdatedIssues((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // if (selectedSeries) {
        //   updateSeriesIssues(newItems, selectedSeries.id);
        // }

        return newItems;
      });
    }
  };

  const handleDelete = (id: string) => {
    const filteredIssues = issues.filter((issue) => issue.id !== id);

    setUpdatedIssues(filteredIssues);

    deleteIssue(id);
  };

  if (issues.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={issues} strategy={verticalListSortingStrategy}>
        <ul className="group flex w-full flex-col gap-2">
          {updatedIssues.map(({ id, title, ordinal }) => (
            <ListItem
              key={id}
              id={id}
              name={title}
              orderNumber={ordinal}
              isDisabled={issues.length < 2}
              withDelete={withDelete}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
};
