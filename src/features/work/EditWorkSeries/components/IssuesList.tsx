'use client';

import { useDeleteIssue, useMoveIssue } from '@/src/entities/series';
import type { SeriesEntity, SeriesId } from '@/src/entities/series/model/series.types';
import type { QueryToken } from '@/src/shared';
import { DragAndDropWrapper } from '@/src/shared/ui';

import { ListItem } from './ListItem';

type IssuesListProps = {
  queryToken: QueryToken;
  seriesId?: SeriesId;
  issues: SeriesEntity['issues'];
  withDelete?: boolean;
};

export const IssuesList = (props: IssuesListProps) => {
  const { seriesId, queryToken, withDelete = false, issues } = props;
  const { deleteIssue } = useDeleteIssue({ queryToken });
  const { moveIssue } = useMoveIssue({ seriesId, queryToken });

  const handleDragEnd = (data: SeriesEntity['issues']) => {
    const updatedIssues = data.map((issue, index) => ({
      ...issue,
      orderNumber: index + 1,
    }));

    const firstUpdatedIssue = updatedIssues.find((issue, index) => issue.id !== issues[index].id);

    if (!firstUpdatedIssue) return;

    moveIssue({
      issueId: firstUpdatedIssue.id,
      newOrdinal: firstUpdatedIssue.orderNumber,
    });
  };

  if (issues.length === 0) return null;

  return (
    <DragAndDropWrapper items={issues} onDragEnd={handleDragEnd}>
      {() => (
        <ul className="group flex w-full flex-col gap-2">
          {issues.map(({ id, title, ordinal }) => (
            <ListItem
              key={id}
              id={id}
              name={title}
              orderNumber={ordinal}
              totalItemsCount={issues.length}
              withDelete={withDelete}
              onDelete={deleteIssue}
            />
          ))}
        </ul>
      )}
    </DragAndDropWrapper>
  );
};
