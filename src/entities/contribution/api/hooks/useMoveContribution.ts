'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type BaseEditSectionProps, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

const { CONTRIBUTION_MOVE_FAILED } = NOTIFICATIONS;

export const useMoveContribution = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const queryToken = useQueryToken();
  const { sendErrorNotification } = useNotifications();
  const { contributionService } = useServices();

  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ contributionId, newOrdinal }: { contributionId: string; newOrdinal: number }) => {
      return contributionService.moveContribution(queryToken, contributionId, newOrdinal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? CONTRIBUTION_MOVE_FAILED);
    },
  });

  return {
    moveContribution: mutateAsync,
    loading: isPending,
  };
};
