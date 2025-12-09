'use client';

import { type BaseEditSectionProps } from '@/src/shared';

import { ContributionsTable } from '../components/Table';
import { useContributionsTable } from './useContributionsTable';

type WorkContributionsTableProps = BaseEditSectionProps & {
  form: Readonly<React.ReactNode>;
  showRecommendations: boolean;
};

const WorkContributionsTable = (props: WorkContributionsTableProps) => {
  const { workId, queryToken, form, showRecommendations } = props;

  const { contributions, activeContribution, dragEnd, editContribution, deleteContribution, switchMainStatus } =
    useContributionsTable({
      workId,
      queryToken,
    });

  return (
    <ContributionsTable
      contributions={contributions}
      activeContribution={activeContribution}
      form={form}
      showRecommendations={showRecommendations}
      onEdit={editContribution}
      onDelete={deleteContribution}
      onSelectAsMain={switchMainStatus}
      onDragEnd={dragEnd}
    />
  );
};

export default WorkContributionsTable;
