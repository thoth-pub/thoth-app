import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import { SetId } from '../../model/set.types';

const { SET_DELETE_FAILED } = NOTIFICATIONS;

export const useDeleteSet = () => {
  const { setService } = useServices();

  const queryClient = useQueryClient();
  const { sendErrorNotification } = useNotifications();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (setId: SetId) => {
      return setService.deleteSet(queryToken, setId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.sets] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.setsCount] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? SET_DELETE_FAILED);
    },
  });

  return {
    deleteSet: mutateAsync,
    loading: isPending,
  };
};
