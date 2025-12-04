'use client';

import { NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { AffiliationEntity } from '../../model/affiliation.types';
import { useMutation } from '@tanstack/react-query';
import { AffiliationService } from '../affiliation.service';

type UseCreateAffiliationProps = {
  queryToken: QueryToken;
  onCompleted?: (data: AffiliationEntity) => void;
};

const { AFFILIATION_CREATION_FAILED } = NOTIFICATIONS;

const affiliationService = new AffiliationService();

const useCreateAffiliation = (props: UseCreateAffiliationProps) => {
  const { queryToken, onCompleted } = props;

  const { sendErrorNotification } = useNotifications();

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
