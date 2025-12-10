'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

const { ISSUE_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteIssue = () => {
  const queryToken = useQueryToken();
  const { sendErrorNotification } = useNotifications();
  const { seriesService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (issueId: string) => {
      return seriesService.deleteIssue(queryToken, issueId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.series] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.seriesesCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ISSUE_DELETE_FAILED);
    },
  });

  return {
    deleteIssue: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteIssue;
