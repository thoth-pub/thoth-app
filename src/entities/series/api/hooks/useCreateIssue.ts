'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, QueryKeys, type QueryToken, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import type { SeriesId } from '../../model/series.types';

type UseCreateIssueProps = {
  queryToken: QueryToken;
};

const { ISSUE_CREATION_FAILED } = NOTIFICATIONS;

const useCreateIssue = ({ queryToken }: UseCreateIssueProps) => {
  const { sendErrorNotification } = useNotifications();
  const { seriesService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: { orderNumber: number; seriesId: SeriesId; workId: WorkId }) => {
      return seriesService.createIssue({ token: queryToken, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.series] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.seriesesCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ISSUE_CREATION_FAILED);
    },
  });

  return {
    createIssue: mutateAsync,
    loading: isPending,
  };
};

export default useCreateIssue;
