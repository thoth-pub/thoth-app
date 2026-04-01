import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { AdditionalResourceEntity } from '../../model/additional-resource.types';

const { ADDITIONAL_RESOURCE_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateAdditionalResource = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { additionalResourceService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: AdditionalResourceEntity) => {
      return additionalResourceService.updateAdditionalResource(data, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ADDITIONAL_RESOURCE_UPDATE_FAILED);
    },
  });

  return {
    updateAdditionalResource: mutateAsync,
    loading: isPending,
  };
};

export default useUpdateAdditionalResource;
