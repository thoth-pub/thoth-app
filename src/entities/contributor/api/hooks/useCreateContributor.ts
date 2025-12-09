'use client';

import { useMutation } from '@tanstack/react-query';

import { NOTIFICATIONS, type QueryToken, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { ContributorEntity } from '../../model/contributor.types';

type UseCreateContributorProps = {
  queryToken: QueryToken;
  onCompleted?: (data: ContributorEntity) => void;
  onError?: (error: Error) => void;
};

const { CONTRIBUTOR_CREATION_SUCCESS, CONTRIBUTOR_CREATION_FAILED } = NOTIFICATIONS;

const useCreateContributor = (props: UseCreateContributorProps) => {
  const { queryToken, onCompleted, onError } = props;

  const { sendErrorNotification, sendSuccessNotification } = useNotifications();
  const { contributorService } = useServices();

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: ContributorEntity) => {
      return contributorService.createContributor(queryToken, data);
    },
    onSuccess: (data) => {
      sendSuccessNotification(CONTRIBUTOR_CREATION_SUCCESS);
      onCompleted?.(data);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? CONTRIBUTOR_CREATION_FAILED);
      onError?.(error);
    },
  });

  return {
    createContributor: mutate,
    loading: isPending,
  };
};

export default useCreateContributor;
