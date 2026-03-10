'use client';

import { DragAndDropWrapper, TableBody, TableHeader, TableWrapper } from '@/src/shared/ui';

import type { WorkContribution } from '../../model/contribution.types';
import { ContributionsTableRow } from './ContributionsTableRow';

type ContributionsTableProps = {
  contributions: WorkContribution[];
  activeContribution: WorkContribution | null;
  form?: React.ReactNode;
  showRecommendations?: boolean;
  deleteLoading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectAsMain: (id: string) => void;
  onDragEnd: (data: WorkContribution[]) => void;
};

export const ContributionsTable = (props: ContributionsTableProps) => {
  const { contributions, activeContribution, form, showRecommendations = false, onEdit, onDelete, deleteLoading = false, onDragEnd } = props;

  return (
    <DragAndDropWrapper items={contributions} onDragEnd={onDragEnd}>
      {(isDragStarted) => (
        <TableWrapper isOverflowHidden={isDragStarted}>
          <TableHeader
            cells={['name', 'type', 'institution', 'biography']}
            cellStyles={[
              'min-w-[250px] pl-4 capitalize',
              'min-w-[120px] capitalize',
              'min-w-[250px] capitalize',
              'min-w-[200px] capitalize',
            ]}
          />
          <TableBody>
            {contributions.map((contribution) => (
              <ContributionsTableRow
                key={contribution.id}
                totalContributionsCount={contributions.length}
                isEditing={activeContribution?.id === contribution.id}
                isEditable={!activeContribution}
                contributor={contribution}
                form={form}
                showRecommendations={showRecommendations}
                onEdit={onEdit}
                onDelete={onDelete}
                deleteLoading={deleteLoading}
              />
            ))}
          </TableBody>
        </TableWrapper>
      )}
    </DragAndDropWrapper>
  );
};
