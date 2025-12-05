import { DragEndEvent } from '@dnd-kit/core';
import React from 'react';

import type { WorkContribution } from '../../model/contribution.types';
import { ContributionsTable } from '../components/Table';

type ChaptersContributionsTableProps = {
  contributions: WorkContribution[];
  activeContribution: WorkContribution | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectAsMain: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  form: Readonly<React.ReactNode>;
  showRecommendations: boolean;
};

const ChaptersContributionsTable = (props: ChaptersContributionsTableProps) => {
  const { contributions, activeContribution, form, showRecommendations, onEdit, onDelete, onSelectAsMain, onDragEnd } =
    props;

  return (
    <ContributionsTable
      contributions={contributions}
      activeContribution={activeContribution}
      form={form}
      showRecommendations={showRecommendations}
      onEdit={onEdit}
      onDelete={onDelete}
      onSelectAsMain={onSelectAsMain}
      onDragEnd={onDragEnd}
    />
  );
};

export default ChaptersContributionsTable;
