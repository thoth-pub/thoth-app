'use client';

import { DragAndDropWrapper, TableBody, TableHeader, TableWrapper } from '@/src/shared/ui';

import type { WorkContribution } from '../../model/contribution.types';
import { ContributionsTableRow } from './ContributionsTableRow';

type ContributionsTableProps = {
  contributions: WorkContribution[];
  activeContribution: WorkContribution | null;
  form?: React.ReactNode;
  showRecommendations?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectAsMain: (id: string) => void;
  onDragEnd: (data: WorkContribution[]) => void;
};

export const ContributionsTable = (props: ContributionsTableProps) => {
  const { contributions, activeContribution, form, showRecommendations = false, onEdit, onDelete, onDragEnd } = props;

  return (
    <DragAndDropWrapper items={contributions} onDragEnd={onDragEnd}>
      {(isDragStarted) => (
        <TableWrapper isOverflowHidden={isDragStarted}>
          <TableHeader
            cells={['Name', 'Type', 'Institution', 'Biography']}
            cellStyles={['min-w-[250px] pl-4', 'min-w-[120px]', 'min-w-[250px]', 'min-w-[200px]']}
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
              />
            ))}
          </TableBody>
        </TableWrapper>
      )}
    </DragAndDropWrapper>
  );
};
