import { type BaseEditSectionProps, NOTIFICATIONS, QueryKeys } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PriceService } from '../price.service';

const { PRICE_DELETE_FAILED } = NOTIFICATIONS;

const priceService = new PriceService();

const useDeletePrice = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

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
