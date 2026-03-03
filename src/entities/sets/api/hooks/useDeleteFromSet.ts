import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import type { SetId } from '../../model/set.types';

const { SET_DELETE_FROM_FAILED } = NOTIFICATIONS;

export const useDeleteFromSet = (setId: SetId) => {
  const { setService } = useServices();

  const queryClient = useQueryClient();
  const { sendErrorNotification } = useNotifications();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (relationId: string) => {
      return setService.deleteBookFromSet(relationId);
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
