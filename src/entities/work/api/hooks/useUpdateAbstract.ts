'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type AbstractEntity, MarkdownFormat, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import type { WorkId } from '../../model/work.types';

const { ABSTRACT_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateAbstract = (workId: WorkId) => {
  const { workService } = useServices();
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, markupFormat }: { data: AbstractEntity; markupFormat: MarkdownFormat }) => {
      return workService.updateAbstract(queryToken, data, workId, markupFormat);
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
