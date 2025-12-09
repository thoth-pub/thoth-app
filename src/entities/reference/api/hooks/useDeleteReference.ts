'use client';

import { useMutation } from '@tanstack/react-query';

import { NOTIFICATIONS, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import type { ReferenceId } from '../../model/reference.types';

const { REFERENCE_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteReference = (props: BaseEditSectionProps) => {
  const { queryToken } = props;

  const { sendErrorNotification } = useNotifications();
  const { referenceService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (referenceId: ReferenceId) => {
      return referenceService.deleteReference(queryToken, referenceId);
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
