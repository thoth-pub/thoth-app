import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { WorkContribution } from '../../model/contribution.types';

const { WORK_CONTRIBUTION_CREATION_FAILED } = NOTIFICATIONS;

export const useCreateContribution = () => {
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, relatedWorkId }: { data: WorkContribution; relatedWorkId: string }) => {
      return contributionService.createContribution(data, relatedWorkId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_CONTRIBUTION_CREATION_FAILED);
    },
  });

  return {
    createContribution: mutateAsync,
    loading: isPending,
  };
};
