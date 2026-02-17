import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { SetEntity } from '../../model/set.types';

const { SET_CREATION_FAILED } = NOTIFICATIONS;

export const useCreateSet = () => {
  const { setService } = useServices();

  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data }: { data: SetEntity }) => {
      return setService.createSet(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.sets] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.setsCount] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? SET_CREATION_FAILED);
    },
  });

  return {
    createSet: mutateAsync,
    loading: isPending,
  };
};
