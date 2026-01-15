import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import { SetEntity } from '../../model/set.types';

const { SET_UPDATE_FAILED } = NOTIFICATIONS;

export const useUpdateSet = () => {
  const { setService } = useServices();

  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: SetEntity) => {
      return setService.updateSet(queryToken, data);
    },
    onSuccess: (data: SetEntity) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.sets] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.set, data.id] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? SET_UPDATE_FAILED);
    },
  });

  return {
    updateSet: mutateAsync,
    loading: isPending,
  };
};
