'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, QueryToken, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import type { SeriesId } from '../../model/series.types';

type UseMoveIssueProps = {
  seriesId?: SeriesId;
  queryToken: QueryToken;
};

const { ISSUE_MOVE_FAILED } = NOTIFICATIONS;

const useMoveIssue = (props: UseMoveIssueProps) => {
  const { queryToken, seriesId } = props;

  const { seriesService } = useServices();
  const { sendErrorNotification } = useNotifications();

  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: { issueId: string; newOrdinal: number }) => {
      return seriesService.moveIssue(queryToken, data.issueId, data.newOrdinal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.series, seriesId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ISSUE_MOVE_FAILED);
    },
  });

  return {
    moveIssue: mutateAsync,
    loading: isPending,
  };
};

export default useMoveIssue;
