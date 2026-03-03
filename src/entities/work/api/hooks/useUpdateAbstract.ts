'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { AbstractEntity } from '@/src/shared/types';

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
