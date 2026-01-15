import { useMutation, useQueryClient } from '@tanstack/react-query';

import { MarkupFormat } from '@/gql/graphql';
import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import { SetEntity } from '../../model/set.types';

const { SET_CREATION_FAILED } = NOTIFICATIONS;

export const useCreateSet = () => {
  const { setService } = useServices();

  const { sendErrorNotification } = useNotifications();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, markupFormat }: { data: SetEntity; markupFormat: MarkupFormat }) => {
      return setService.createSet(queryToken, data, markupFormat);
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
