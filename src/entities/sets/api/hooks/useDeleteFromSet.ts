import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import type { SetId } from '../../model/set.types';

const { SET_DELETE_FROM_FAILED } = NOTIFICATIONS;

export const useDeleteFromSet = (setId: SetId) => {
  const { setService } = useServices();

  const queryClient = useQueryClient();
  const { sendErrorNotification } = useNotifications();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (relationId: string) => {
      return setService.deleteBookFromSet(queryToken, relationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.set, setId] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.bookSetWorks, setId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? SET_DELETE_FROM_FAILED);
    },
  });

  return { deleteFromSet: mutateAsync, loading: isPending };
};
