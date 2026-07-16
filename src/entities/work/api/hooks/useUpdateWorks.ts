'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import type { WorkEntity } from '../../model/work.types';

const { WORK_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateWorks = () => {
  const { sendErrorNotification } = useNotifications();
  const { workService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: WorkEntity) => {
      return workService.updateWork(data);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_UPDATE_FAILED);
    },
  });

  const updateWorks = async (data: WorkEntity[]) => {
    const promises = data.map((work) => mutateAsync(work));
    const results = await Promise.allSettled(promises);
    const hasSuccessfulUpdate = results.some(({ status }) => status === 'fulfilled');

    if (hasSuccessfulUpdate || data.length === 0) {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    }

    const failedUpdate = results.find((result) => result.status === 'rejected');

    if (failedUpdate) throw failedUpdate.reason;
  };

  return {
    updateWorks,
    loading: isPending,
  };
};

export default useUpdateWorks;
