'use client';

import { NOTIFICATIONS, QueryKeys, QueryToken } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import { WorkContribution } from '../../model/contribution.types';
import { WorkId } from '@/src/entities/work/model/work.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ContributionService } from '../contribution.service';

const { WORK_CONTRIBUTION_UPDATE_FAILED } = NOTIFICATIONS;

const contributionService = new ContributionService();

const useContributionsBulkUpdate = (queryToken: QueryToken) => {
  const { sendErrorNotification } = useNotifications();

  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ contribution, relatedWorkId }: { contribution: WorkContribution; relatedWorkId: WorkId }) => {
      return contributionService.updateContribution(queryToken, contribution, relatedWorkId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_CONTRIBUTION_UPDATE_FAILED);
    },
  });

  const updateContributions = async (contributions: { id: WorkId; contribution: WorkContribution }[]) => {
    const promises = contributions.map(({ id, contribution }) => mutateAsync({ contribution, relatedWorkId: id }));

    await Promise.all(promises);

    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
  };

  return {
    updateContributions,
  };
};

export default useContributionsBulkUpdate;
