'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { EndorsementEntity } from '../../model/endorsement.types';

const { ENDORSEMENT_CREATION_FAILED } = NOTIFICATIONS;

const useCreateEndorsement = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { endorsementService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: EndorsementEntity) => {
      return endorsementService.createEndorsement(data, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ENDORSEMENT_CREATION_FAILED);
    },
  });

  return {
    createEndorsement: mutateAsync,
    loading: isPending,
  };
};

export default useCreateEndorsement;
