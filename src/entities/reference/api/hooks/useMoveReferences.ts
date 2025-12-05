import { BaseEditSectionProps, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ReferenceEntity, ReferenceId } from '../../model/reference.types';
import { useNotifications } from '@/src/shared/hooks';

const { REFERENCE_MOVE_FAILED } = NOTIFICATIONS;

export default function useMoveReferences(props: BaseEditSectionProps) {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { referenceService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ referenceId, newOrdinal }: { referenceId: ReferenceId; newOrdinal: number }) => {
      return referenceService.moveReference(queryToken, referenceId, newOrdinal);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? REFERENCE_MOVE_FAILED);
    },
  });

  const moveReferences = async (references: ReferenceEntity[]) => {
    const promises = references.map((reference) =>
      mutateAsync({ referenceId: reference.id, newOrdinal: reference.orderNumber }),
    );

    await Promise.all(promises);

    queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
  };

  return {
    moveReferences: moveReferences,
    loading: isPending,
  };
}
