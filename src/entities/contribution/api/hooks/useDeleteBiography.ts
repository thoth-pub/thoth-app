'use client';

import { useMutation } from '@tanstack/react-query';

import { NOTIFICATIONS, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

const { BIOGRAPHY_DELETE_FAILED } = NOTIFICATIONS;

export const useDeleteBiography = () => {
  const { sendErrorNotification } = useNotifications();
  const { contributionService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (biographyId: string) => {
      return contributionService.deleteBiography(biographyId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? BIOGRAPHY_DELETE_FAILED);
    },
  });

  return { deleteBiography: mutateAsync, loading: isPending };
};
