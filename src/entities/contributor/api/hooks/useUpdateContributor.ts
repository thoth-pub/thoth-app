'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import type { ContributorEntity } from '../../model/contributor.types';

type UseUpdateContributorProps = {
  onCompleted?: (data: ContributorEntity) => void;
  onError?: (error: Error) => void;
};

const { CONTRIBUTOR_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateContributor = (props: UseUpdateContributorProps) => {
  const { onCompleted, onError } = props;

  const { sendErrorNotification } = useNotifications();
  const { contributorService } = useServices();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: ContributorEntity) => {
      return contributorService.updateContributor(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.contributor, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.contributors] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.workChapters] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.works] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.books] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.latestUpdatedBooks] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.latestPublishedBooks] });
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
