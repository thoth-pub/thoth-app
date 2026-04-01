'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { BiographyEntity } from '../../model/contribution.types';

const { BIOGRAPHY_UPDATE_FAILED } = NOTIFICATIONS;

export const useUpdateBiography = (workId: WorkId) => {
  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data }: { data: BiographyEntity }) => {
      return contributionService.updateBiography(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? BIOGRAPHY_UPDATE_FAILED);
    },
  });

  return { updateBiography: mutateAsync, loading: isPending };
};
