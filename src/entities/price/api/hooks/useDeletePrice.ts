import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type BaseEditSectionProps, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

const { PRICE_DELETE_FAILED } = NOTIFICATIONS;

const useDeletePrice = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { priceService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (priceId: string) => {
      return priceService.deletePrice(queryToken, priceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? PRICE_DELETE_FAILED);
    },
  });

  return {
    deletePrice: mutateAsync,
    loading: isPending,
  };
};

export default useDeletePrice;
