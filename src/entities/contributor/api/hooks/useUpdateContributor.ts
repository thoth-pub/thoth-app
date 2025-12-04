'use client';

import { NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import type { ContributorEntity } from '../../model/contributor.types';
import { useMutation } from '@tanstack/react-query';
import { ContributorService } from '../contributor.service';

type UseUpdateContributorProps = {
  queryToken: QueryToken;
  onCompleted?: (data: ContributorEntity) => void;
  onError?: (error: Error) => void;
};

const contributorService = new ContributorService();

const { CONTRIBUTOR_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateContributor = (props: UseUpdateContributorProps) => {
  const { queryToken, onCompleted, onError } = props;

  const { sendErrorNotification } = useNotifications();

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: ContributorEntity) => {
      return contributorService.updateContributor(queryToken, data);
    },
    onSuccess: (data) => {
      onCompleted?.(data);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? CONTRIBUTOR_UPDATE_FAILED);
      onError?.(error);
    },
  });

  return {
    updateContributor: mutate,
    loading: isPending,
  };
};

export default useUpdateContributor;
