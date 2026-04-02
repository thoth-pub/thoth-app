'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { WorkContribution } from '../../model/contribution.types';

const { WORK_CONTRIBUTION_UPDATE_FAILED } = NOTIFICATIONS;

type UseUpdateContributionProps = {
  relatedWorkId: string;
};

export const useUpdateContribution = (props: UseUpdateContributionProps & { relatedWorkId: string }) => {
  const { relatedWorkId } = props;

  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: WorkContribution) => {
      return contributionService.updateContribution(data, relatedWorkId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_CONTRIBUTION_UPDATE_FAILED);
    },
  });

  return {
    updateContribution: mutateAsync,
    loading: isPending,
  };
};
