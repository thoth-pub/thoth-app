'use client';

import { NOTIFICATIONS, QueryKeys, QueryToken } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { WorkEntity } from '../../model/work.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkService } from '../work.service';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

const workService = new WorkService();

const useUpdateWorks = (queryToken: QueryToken) => {
  const { sendErrorNotification } = useNotifications();

  const queryClient = useQueryClient();

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
