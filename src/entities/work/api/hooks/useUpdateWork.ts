'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BaseEditSectionProps, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import { WorkEntity } from '../../model/work.types';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

export const useUpdateWork = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const { sendErrorNotification } = useNotifications();
  const { workService } = useServices();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: WorkEntity) => {
      return workService.updateWork(queryToken, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_UPDATE_FAILED);
    },
  });

  return {
    updateWork: mutateAsync,
    loading: isPending,
  };
};
