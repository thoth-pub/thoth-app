'use client';

import { BaseEditSectionProps, NOTIFICATIONS, QueryKeys } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { WorkEntity } from '../../model/work.types';
import { WorkService } from '../work.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

const workService = new WorkService();

export const useUpdateWork = ({ queryToken }: BaseEditSectionProps) => {
  const { sendErrorNotification } = useNotifications();

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
