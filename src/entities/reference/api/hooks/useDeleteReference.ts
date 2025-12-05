'use client';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import type { ReferenceId } from '../../model/reference.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { REFERENCE_DELETE_FAILED } = NOTIFICATIONS;

const useCreateReference = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { referenceService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (referenceId: ReferenceId) => {
      return referenceService.deleteReference(queryToken, referenceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
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

export default useCreateReference;
