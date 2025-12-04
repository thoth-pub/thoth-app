'use client';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, QueryKeys, type QueryToken } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import type { SeriesId } from '../../model/series.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SeriesService } from '../series.service';

type UseCreateIssueProps = {
  queryToken: QueryToken;
};

const { ISSUE_CREATION_FAILED } = NOTIFICATIONS;

const seriesService = new SeriesService();

const useCreateIssue = ({ queryToken }: UseCreateIssueProps) => {
  const { sendErrorNotification } = useNotifications();

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
