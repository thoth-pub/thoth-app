'use client';

import { useDeleteIssue, useMoveIssue } from '@/src/entities/series';
import type { SeriesEntity, SeriesId } from '@/src/entities/series/model/series.types';
import { Backdrop, CircularProgress, DragAndDropWrapper, Typography } from '@/src/shared/ui';

import { ListItem } from './ListItem';

type IssuesListProps = {
  seriesId?: SeriesId;
  issues: SeriesEntity['issues'];
  withDelete?: boolean;
  loading?: boolean;
};

export const IssuesList = (props: IssuesListProps) => {
  const { seriesId, withDelete = false, issues, loading = false } = props;
  const { deleteIssue } = useDeleteIssue();
  const { moveIssue } = useMoveIssue({ seriesId });

  const handleDragEnd = (data: SeriesEntity['issues']) => {
    const updatedIssues = data.map((issue, index) => ({
      ...issue,
      orderNumber: index + 1,
    }));

    const firstUpdatedIssue = updatedIssues.find((issue, index) => issue.id !== issues[index]?.id);

    if (!firstUpdatedIssue) return;

    moveIssue({
      issueId: firstUpdatedIssue.id,
      newOrdinal: firstUpdatedIssue.orderNumber,
    });
  };

  if (issues.length === 0) return null;

  return (
    <div className="relative">
      <Typography fontWeight="bold">Titles</Typography>
      <DragAndDropWrapper items={issues} onDragEnd={handleDragEnd}>
        {() => (
          <ul className="group flex w-full flex-col gap-2">
            {issues.map(({ id, title, ordinal, workId }) => (
              <ListItem
                key={id}
                id={id}
                name={title}
                workId={workId}
                orderNumber={ordinal}
                totalItemsCount={issues.length}
                withDelete={withDelete}
                onDelete={deleteIssue}
              />
            ))}
          </ul>
        )}
      </DragAndDropWrapper>
      <Backdrop open={loading} className="absolute h-full w-full bg-white/50">
        <CircularProgress />
      </Backdrop>
    </div>
  );
};
