'use client';
import { useMutation } from '@tanstack/react-query';

import { NOTIFICATIONS } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

const { ABSTRACT_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteAbstract = () => {
  const { workService } = useServices();
  const { sendErrorNotification } = useNotifications();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (abstractId: string) => {
      return workService.deleteAbstract(abstractId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ABSTRACT_DELETE_FAILED);
    },
  });

  return { deleteAbstract: mutateAsync, loading: isPending };
};

export default useDeleteAbstract;
