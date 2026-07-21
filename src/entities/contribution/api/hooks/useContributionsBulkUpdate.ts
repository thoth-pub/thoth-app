'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { WorkContribution } from '../../model/contribution.types';

const { WORK_CONTRIBUTION_UPDATE_FAILED } = NOTIFICATIONS;

const useContributionsBulkUpdate = () => {
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ contribution, relatedWorkId }: { contribution: WorkContribution; relatedWorkId: WorkId }) => {
      return contributionService.updateContribution(contribution, relatedWorkId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_CONTRIBUTION_UPDATE_FAILED);
    },
  });

  const updateContributions = async (contributions: { id: WorkId; contribution: WorkContribution }[]) => {
    const promises = contributions.map(({ id, contribution }) => mutateAsync({ contribution, relatedWorkId: id }));
    const results = await Promise.allSettled(promises);
    const hasSuccessfulUpdate = results.some(({ status }) => status === 'fulfilled');

    if (hasSuccessfulUpdate || contributions.length === 0) {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.works] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.books] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.latestUpdatedBooks] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.latestPublishedBooks] });
    }

    const failedUpdate = results.find((result) => result.status === 'rejected');

    if (failedUpdate) throw failedUpdate.reason;
  };

  return {
    updateContributions,
    loading: isPending,
  };
};

export default useContributionsBulkUpdate;
