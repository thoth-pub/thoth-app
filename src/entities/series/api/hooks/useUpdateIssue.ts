'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, QueryKeys, type QueryToken, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import type { SeriesId } from '../../model/series.types';

type UseUpdateIssueProps = {
  queryToken: QueryToken;
};

const { ISSUE_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateIssue = (props: UseUpdateIssueProps) => {
  const { queryToken } = props;

  const { sendErrorNotification } = useNotifications();
  const { seriesService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: { issueId: string; orderNumber: number; seriesId: SeriesId; workId: WorkId }) => {
      return seriesService.updateIssue({ token: queryToken, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.series] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.seriesesCount] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ISSUE_UPDATE_FAILED);
    },
  });

  return {
    updateIssue: mutateAsync,
    loading: isPending,
  };
};

export default useUpdateIssue;
