import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PublicationId } from '@/src/entities/publication/model/publication.types';
import { type BaseEditSectionProps, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import { PriceEntity } from '../../model/price.types';

const { PRICE_CREATION_FAILED } = NOTIFICATIONS;

const useCreatePrice = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { priceService } = useServices();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: PriceEntity & { publicationId: PublicationId }) => {
      return priceService.createPrice(queryToken, data, data.publicationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? PRICE_CREATION_FAILED);
    },
  });

  return {
    createPrice: mutateAsync,
    loading: isPending,
  };
};

export default useCreatePrice;
