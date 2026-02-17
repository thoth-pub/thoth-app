'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type AbstractEntity, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import type { WorkId } from '../../model/work.types';

const { ABSTRACT_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateAbstract = (workId: WorkId) => {
  const { workService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data }: { data: AbstractEntity }) => {
      return workService.updateAbstract(data, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ABSTRACT_UPDATE_FAILED);
    },
  });

  return { updateAbstract: mutateAsync, loading: isPending };
};

export default useUpdateAbstract;
