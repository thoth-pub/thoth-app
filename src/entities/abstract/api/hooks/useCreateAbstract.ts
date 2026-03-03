'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import { AbstractEntity } from '@/src/shared/types';

import type { WorkId } from '../../../work/model/work.types';

const { ABSTRACT_CREATION_FAILED } = NOTIFICATIONS;

const useCreateAbstract = (workId: WorkId) => {
  const { abstractService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data }: { data: AbstractEntity }) => {
      return abstractService.createAbstract(data, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ABSTRACT_CREATION_FAILED);
    },
  });

  return { createAbstract: mutateAsync, loading: isPending };
};

export default useCreateAbstract;
