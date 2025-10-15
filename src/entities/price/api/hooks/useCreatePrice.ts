import type { CreatePriceMutation } from '@/gql/graphql';
import type { PublicationId } from '@/src/entities/publication/model/publication.types';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { type BaseEditSectionProps, NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { PriceDtoMapper } from '../../model/price.mapper';
import { CREATE_PRICE } from '../../model/price.schema';
import { PriceEntity } from '../../model/price.types';

type UseCreatePriceProps = BaseEditSectionProps;

const mapper = new PriceDtoMapper();

const { PRICE_CREATION_FAILED } = NOTIFICATIONS;

const useCreatePrice = (props: UseCreatePriceProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate] = useMutationWithAuth<CreatePriceMutation>({
    queryToken,
    mutation: CREATE_PRICE,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(PRICE_CREATION_FAILED);
      },
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
    },
  });

  const createPrice = (data: Omit<PriceEntity, 'id'> & { publicationId: PublicationId }) => {
    const { priceId, ...dto } = mapper.toDto({ ...data, id: '' });

    mutate({
      variables: { data: { ...dto, publicationId: data.publicationId } },
    });
  };

  return {
    createPrice,
  };
};

export default useCreatePrice;
