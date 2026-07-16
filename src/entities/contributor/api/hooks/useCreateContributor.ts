'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { ContributorEntity } from '../../model/contributor.types';

type UseCreateContributorProps = {
  onCompleted?: (data: ContributorEntity) => void;
  onError?: (error: Error) => void;
};

const { CONTRIBUTOR_CREATION_SUCCESS, CONTRIBUTOR_CREATION_FAILED } = NOTIFICATIONS;

const useCreateContributor = (props: UseCreateContributorProps) => {
  const { onCompleted, onError } = props;

  const { sendErrorNotification, sendSuccessNotification } = useNotifications();
  const { contributorService } = useServices();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: ContributorEntity) => {
      return contributorService.createContributor(data);
    },
    onSuccess: (data) => {
      sendSuccessNotification(CONTRIBUTOR_CREATION_SUCCESS);
      queryClient.invalidateQueries({ queryKey: [QueryKeys.contributors] });
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
