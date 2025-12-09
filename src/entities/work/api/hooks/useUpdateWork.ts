'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BaseEditSectionProps, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { WorkEntity } from '../../model/work.types';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

export const useUpdateWork = ({ queryToken }: BaseEditSectionProps) => {
  const { sendErrorNotification } = useNotifications();
  const { workService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: WorkEntity) => {
      return workService.updateWork(queryToken, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
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
