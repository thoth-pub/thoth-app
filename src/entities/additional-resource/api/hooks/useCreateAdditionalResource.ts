'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications, usePreventInteraction, usePreventNavigation, useProgress } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { AdditionalResourceEntity } from '../../model/additional-resource.types';

const { ADDITIONAL_RESOURCE_CREATION_FAILED } = NOTIFICATIONS;

const useCreateAdditionalResource = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { additionalResourceService } = useServices();
  const queryClient = useQueryClient();
  const { progress, setProgress, startProgress, resetProgress } = useProgress();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, file }: { data: AdditionalResourceEntity; file?: File }) => {
      startProgress();
      return additionalResourceService.createAdditionalResource(data, workId, file, setProgress);
    },
    onSettled: resetProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ADDITIONAL_RESOURCE_CREATION_FAILED);
    },
  });

  usePreventNavigation(isPending);
  usePreventInteraction(isPending);

  return {
    createAdditionalResource: mutateAsync,
    loading: isPending,
    progress,
  };
};

export default useCreateAdditionalResource;
