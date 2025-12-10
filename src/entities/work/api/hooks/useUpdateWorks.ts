'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import { WorkEntity } from '../../model/work.types';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateWorks = () => {
  const { sendErrorNotification } = useNotifications();
  const { workService } = useServices();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: WorkEntity) => {
      return workService.updateWork(queryToken, data);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_UPDATE_FAILED);
    },
  });

  const updateWorks = async (data: WorkEntity[]) => {
    const promises = data.map((work) => mutate(work));

    await Promise.all(promises);

    queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
  };

  return {
    updateWorks,
    loading: isPending,
  };
};

export default useUpdateWorks;
