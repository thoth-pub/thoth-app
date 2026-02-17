import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BaseEditSectionProps, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { ReferenceId } from '../../model/reference.types';

const { REFERENCE_MOVE_FAILED } = NOTIFICATIONS;

export default function useMoveReferences(props: BaseEditSectionProps) {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { referenceService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ referenceId, newOrdinal }: { referenceId: ReferenceId; newOrdinal: number }) => {
      return referenceService.moveReference(referenceId, newOrdinal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? REFERENCE_MOVE_FAILED);
    },
  });

  return {
    moveReferences: mutateAsync,
    loading: isPending,
  };
}
