'use client';

import { NOTIFICATIONS, useServices, type QueryToken } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { AffiliationEntity } from '../../model/affiliation.types';
import { useMutation } from '@tanstack/react-query';

type UseCreateAffiliationProps = {
  queryToken: QueryToken;
  onCompleted?: (data: AffiliationEntity) => void;
};

const { AFFILIATION_CREATION_FAILED } = NOTIFICATIONS;

const useCreateAffiliation = (props: UseCreateAffiliationProps) => {
  const { queryToken, onCompleted } = props;

  const { sendErrorNotification } = useNotifications();
  const { affiliationService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: AffiliationEntity) => {
      return affiliationService.createAffiliation({ token: queryToken, data });
    },
    onSuccess: (data) => {
      onCompleted?.(data);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? AFFILIATION_CREATION_FAILED);
    },
  });

  return {
    createAffiliation: mutateAsync,
    loading: isPending,
  };
};

export default useCreateAffiliation;
