import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { SetId } from '../../model/set.types';

const { SET_DELETE_FAILED } = NOTIFICATIONS;

export const useDeleteSet = () => {
  const { setService } = useServices();

  const queryClient = useQueryClient();
  const { sendErrorNotification } = useNotifications();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (setId: SetId) => {
      return setService.deleteSet(setId);
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
