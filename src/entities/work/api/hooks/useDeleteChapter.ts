'use client';

import { type BaseEditSectionProps, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { WorkId } from '../../model/work.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { WORK_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteChapter = ({ queryToken }: BaseEditSectionProps) => {
  const { sendErrorNotification } = useNotifications();
  const { workService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (workId: WorkId) => {
      return workService.deleteWork(queryToken, workId);
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
