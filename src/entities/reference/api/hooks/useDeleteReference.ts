'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import type { ReferenceId } from '../../model/reference.types';

const { REFERENCE_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteReference = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { referenceService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (referenceId: ReferenceId) => {
      return referenceService.deleteReference(referenceId);
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

export default useDeleteReference;
