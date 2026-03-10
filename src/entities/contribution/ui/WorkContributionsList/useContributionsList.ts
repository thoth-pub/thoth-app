'use client';

import { useQueryClient } from '@tanstack/react-query';

import { useContributionStateMachine, useMoveContribution } from '@/src/entities/contribution';
import type { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import { useWork } from '@/src/entities/work';
import { QueryKeys } from '@/src/shared/constants';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { WorkContribution } from '../../model/contribution.types';

export const useContributionsList = ({ workId }: BaseEditSectionProps) => {
  const { work, loading, fetching, deleteContributionLoading, deleteContribution } = useWork(workId);

  const { updateContribution } = useWork(workId);
  const { moveContribution } = useMoveContribution({ workId });

  const { activeEntity: activeContribution, edit } = useContributionStateMachine();
  const { activeFormId } = useFormStateMachine();
  const queryClient = useQueryClient();

  const dragEnd = (data: WorkContribution[]) => {
    const reorderedContributions = data.map((contribution, index) => ({
      ...contribution,
      orderNumber: index + 1,
    }));

    const firstChangedContribution = reorderedContributions.find(
      (contribution, index) => contribution.id !== work.contributions[index]?.id,
    );

    if (!firstChangedContribution) return;

    moveContribution({ contributionId: firstChangedContribution.id, newOrdinal: firstChangedContribution.orderNumber });
  };

  const editContribution = (id: ContributionId) => {
    const contribution = work.contributions.find((contribution) => contribution.id === id);

    if (!contribution) return;

    edit(contribution);
  };

  const switchMainStatus = (id: ContributionId) => {
    const contribution = work.contributions.find((contribution) => contribution.id === id);

    if (!contribution) return;

    updateContribution({ ...contribution, isMain: !contribution.isMain });

    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
  };

  const deleteWorkContribution = async (id: ContributionId) => {
    const contribution = work.contributions.find((contribution) => contribution.id === id);

    if (!contribution) return;

    await deleteContribution(id);
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
  };

  return {
    contributions: work.contributions,
    activeContribution,
    loading,
    fetching,
    editDisabled: !!activeFormId,
    deleteLoading: deleteContributionLoading,
    dragEnd,
    editContribution,
    deleteContribution: deleteWorkContribution,
    switchMainStatus,
  };
};
