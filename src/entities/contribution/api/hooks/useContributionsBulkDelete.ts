'use client';

import { NOTIFICATIONS, QueryKeys, QueryToken } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { ContributionId } from '@/src/entities/contributor/model/contributor.types';
import { ContributionService } from '@/src/entities/contribution';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { WORK_CONTRIBUTION_DELETION_FAILED } = NOTIFICATIONS;

const contributionService = new ContributionService();

const useContributionsBulkDelete = (queryToken: QueryToken) => {
  const { sendErrorNotification } = useNotifications();

  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (contributionId: ContributionId) => {
      return contributionService.deleteContribution(queryToken, contributionId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_CONTRIBUTION_DELETION_FAILED);
    },
  });

  const deleteContributions = async (contributionIds: ContributionId[]) => {
    const promises = contributionIds.map((contributionId) => mutateAsync(contributionId));
    await Promise.all(promises);
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
  };

  return {
    deleteContributions,
    loading: isPending,
  };
};

export default useContributionsBulkDelete;
