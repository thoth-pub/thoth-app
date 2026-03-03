'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

const { ABSTRACT_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteAbstract = (workId: WorkId) => {
  const { abstractService } = useServices();
  const queryClient = useQueryClient();
  const { sendErrorNotification } = useNotifications();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (abstractId: string) => {
      return abstractService.deleteAbstract(abstractId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ABSTRACT_DELETE_FAILED);
    },
  });

  return { deleteAbstract: mutateAsync, loading: isPending };
};

export default useDeleteAbstract;
