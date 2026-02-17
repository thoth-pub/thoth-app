import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { ReferenceEntity } from '../../model/reference.types';

const { REFERENCE_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateReference = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { referenceService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: ReferenceEntity) => {
      return referenceService.updateReference(data, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? REFERENCE_UPDATE_FAILED);
    },
  });

  return {
    updateReference: mutateAsync,
    loading: isPending,
  };
};

export default useUpdateReference;
