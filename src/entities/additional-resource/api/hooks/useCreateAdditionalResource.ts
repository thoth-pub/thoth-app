'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { AdditionalResourceEntity } from '../../model/additional-resource.types';

const { ADDITIONAL_RESOURCE_CREATION_FAILED } = NOTIFICATIONS;

const useCreateAdditionalResource = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { additionalResourceService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, file }: { data: AdditionalResourceEntity; file?: File }) => {
      return additionalResourceService.createAdditionalResource(data, workId, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ADDITIONAL_RESOURCE_CREATION_FAILED);
    },
  });

  return {
    createAdditionalResource: mutateAsync,
    loading: isPending,
  };
};

export default useCreateAdditionalResource;
