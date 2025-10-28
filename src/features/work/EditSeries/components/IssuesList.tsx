'use client';

import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';

import { usePublisherStateMachine } from '@/src/entities/publisher';
import { useSeries, useUpdateIssue } from '@/src/entities/series';
import type { SeriesId } from '@/src/entities/series/model/series.types';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { QueryToken } from '@/src/shared/interfaces';

import { ListItem } from './ListItem';

type IssuesListProps = {
  seriesName: string;
  workId: WorkId;
  queryToken: QueryToken;
};

export const IssuesList = (props: IssuesListProps) => {
  const { seriesName, workId, queryToken } = props;

  const { activePublisher } = usePublisherStateMachine();
  const publishersIds = activePublisher ? [activePublisher] : [];

  const { series, loading } = useSeries({ publishersIds, filter: seriesName });
  const { updateIssue } = useUpdateIssue({ workId, queryToken });

  const sensors = useSensors(useSensor(PointerSensor));

  const selectedSeries = series.find((series) => series.name === seriesName);

  const [issues, setIssues] = useState(selectedSeries?.issues ?? []);

  useEffect(() => {
    if (selectedSeries) {
      setIssues(selectedSeries.issues);
    }
  }, [seriesName, loading]);

  const updateSeriesIssues = (issues: { id: string }[], seriesId: SeriesId) => {
    issues.forEach(({ id }, index) => {
      updateIssue({
        issueId: id,
        orderNumber: index + 1,
        seriesId,
        workId,
      });
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setIssues((items) => {
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

  if (issues.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={issues} strategy={verticalListSortingStrategy}>
        <ul className="group flex w-full flex-col gap-2">
          {issues.map(({ id, title, ordinal }) => (
            <ListItem key={id} id={id} name={title} orderNumber={ordinal} isDisabled={issues.length < 2} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
};
