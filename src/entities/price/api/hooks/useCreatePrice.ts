import type { PublicationId } from '@/src/entities/publication/model/publication.types';
import { type BaseEditSectionProps, NOTIFICATIONS, QueryKeys } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { PriceEntity } from '../../model/price.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PriceService } from '../price.service';

const priceService = new PriceService();

const { PRICE_CREATION_FAILED } = NOTIFICATIONS;

const useCreatePrice = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const queryClient = useQueryClient();

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
