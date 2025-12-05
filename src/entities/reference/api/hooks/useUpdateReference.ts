import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { ReferenceEntity } from '../../model/reference.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { REFERENCE_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateReference = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { referenceService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: ReferenceEntity) => {
      return referenceService.updateReference(queryToken, data, workId);
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
