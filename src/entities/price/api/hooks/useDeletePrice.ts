import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import { type BaseEditSectionProps } from '@/src/shared/types';

const { PRICE_DELETE_FAILED } = NOTIFICATIONS;

const useDeletePrice = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { priceService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (priceId: string) => {
      return priceService.deletePrice(priceId);
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
