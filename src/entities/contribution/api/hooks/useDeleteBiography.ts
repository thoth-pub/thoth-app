'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

const { BIOGRAPHY_DELETE_FAILED } = NOTIFICATIONS;

export const useDeleteBiography = (workId: WorkId) => {
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (biographyId: string) => {
      return contributionService.deleteBiography(queryToken, biographyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? BIOGRAPHY_DELETE_FAILED);
    },
  });

  return { deleteBiography: mutateAsync, loading: isPending };
};
