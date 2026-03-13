'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import type { EndorsementId } from '../../model/endorsement.types';

const { ENDORSEMENT_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteEndorsement = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { endorsementService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (endorsementId: EndorsementId) => {
      return endorsementService.deleteEndorsement(endorsementId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ENDORSEMENT_DELETE_FAILED);
    },
  });

  return {
    deleteEndorsement: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteEndorsement;
