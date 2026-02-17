'use client';

import { useMutation } from '@tanstack/react-query';

import { NOTIFICATIONS, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import type { ReferenceId } from '../../model/reference.types';

const { REFERENCE_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteReference = () => {
  const { sendErrorNotification } = useNotifications();
  const { referenceService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (referenceId: ReferenceId) => {
      return referenceService.deleteReference(referenceId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? REFERENCE_DELETE_FAILED);
    },
  });

  return {
    deleteReference: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteReference;
