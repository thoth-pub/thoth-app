'use client';

import { useMutation } from '@tanstack/react-query';

import { NOTIFICATIONS } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { AffiliationEntity } from '../../model/affiliation.types';

type UseCreateAffiliationProps = Partial<{
  onCompleted: (data: AffiliationEntity) => void;
}>;

const { AFFILIATION_CREATION_FAILED } = NOTIFICATIONS;

const useCreateAffiliation = (props: UseCreateAffiliationProps) => {
  const { onCompleted } = props;

  const { sendErrorNotification } = useNotifications();
  const { affiliationService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: AffiliationEntity) => {
      return affiliationService.createAffiliation(data);
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
