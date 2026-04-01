'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import { BaseEditSectionProps } from '@/src/shared/types';

import type { AdditionalResourceId } from '../../model/additional-resource.types';

const { ADDITIONAL_RESOURCE_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteAdditionalResource = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { additionalResourceService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (additionalResourceId: AdditionalResourceId) => {
      return additionalResourceService.deleteAdditionalResource(additionalResourceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ADDITIONAL_RESOURCE_DELETE_FAILED);
    },
  });

  return {
    deleteAdditionalResource: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteAdditionalResource;
