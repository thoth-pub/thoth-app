'use client';

import { useMutation } from '@tanstack/react-query';

import { NOTIFICATIONS } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { AffiliationEntity } from '../../model/affiliation.types';

const { AFFILIATION_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateAffiliation = () => {
  const { sendErrorNotification } = useNotifications();
  const { affiliationService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: AffiliationEntity) => {
      return affiliationService.updateAffiliation(data);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? AFFILIATION_UPDATE_FAILED);
    },
  });

  return {
    updateAffiliation: mutateAsync,
    loading: isPending,
  };
};

export default useUpdateAffiliation;
