'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { WorkId } from '../../model/work.types';

const { WORK_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteChapter = () => {
  const { sendErrorNotification } = useNotifications();
  const { workService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (workId: WorkId) => {
      return workService.deleteWork(workId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? WORK_DELETE_FAILED);
    },
  });

  const deleteChapter = async (workId: WorkId) => {
    await mutateAsync(workId);
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
  };

  const deleteChapters = async (workIds: WorkId[]) => {
    await Promise.all(workIds.map((workId) => mutateAsync(workId)));
    queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
  };

  return {
    deleteChapter,
    deleteChapters,
    loading: isPending,
  };
};

export default useDeleteChapter;
