'use client';
import { useMutation } from '@tanstack/react-query';

import { NOTIFICATIONS, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

const { ABSTRACT_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteAbstract = () => {
  const { workService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (abstractId: string) => {
      return workService.deleteAbstract(queryToken, abstractId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ABSTRACT_DELETE_FAILED);
    },
  });

  return { deleteAbstract: mutateAsync, loading: isPending };
};

export default useDeleteAbstract;
