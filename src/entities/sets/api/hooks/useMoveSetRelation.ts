import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import type { SetId } from '../../model/set.types';

const { SET_MOVE_RELATION_FAILED } = NOTIFICATIONS;

export const useMoveSetRelation = (id: SetId) => {
  const { setService } = useServices();

  const queryClient = useQueryClient();
  const { sendErrorNotification } = useNotifications();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ relationId, newOrdinal }: { relationId: string; newOrdinal: number }) => {
      return setService.moveBookInSet(relationId, newOrdinal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.bookSetWorks, id] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? SET_MOVE_RELATION_FAILED);
    },
  });

  return { moveSetRelation: mutateAsync, isPending };
};
