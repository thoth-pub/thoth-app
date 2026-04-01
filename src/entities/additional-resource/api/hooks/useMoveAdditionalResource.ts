import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { AdditionalResourceId } from '../../model/additional-resource.types';

const { ADDITIONAL_RESOURCE_MOVE_FAILED } = NOTIFICATIONS;

export default function useMoveAdditionalResource(props: BaseEditSectionProps) {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { additionalResourceService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({
      additionalResourceId,
      newOrdinal,
    }: {
      additionalResourceId: AdditionalResourceId;
      newOrdinal: number;
    }) => {
      return additionalResourceService.moveAdditionalResource(additionalResourceId, newOrdinal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? ADDITIONAL_RESOURCE_MOVE_FAILED);
    },
  });

  return {
    moveAdditionalResource: mutateAsync,
    loading: isPending,
  };
}
