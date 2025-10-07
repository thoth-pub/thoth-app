import type { DeletePriceMutation } from '@/gql/graphql';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { type BaseEditSectionProps, NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { DELETE_PRICE } from '../../model/price.schema';

type UseDeletePriceProps = BaseEditSectionProps;

const { PRICE_DELETE_FAILED } = NOTIFICATIONS;

const useDeletePrice = (props: UseDeletePriceProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const [mutate] = useMutationWithAuth<DeletePriceMutation>({
    queryToken,
    mutation: DELETE_PRICE,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(PRICE_DELETE_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  const deletePrice = (priceId: string) => {
    mutate({
      variables: { priceId },
    });
  };

  return {
    deletePrice,
  };
};

export default useDeletePrice;
