import type { UpdatePriceMutation } from '@/gql/graphql';
import type { PublicationId } from '@/src/entities/publication/model/publication.types';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { type BaseEditSectionProps, NOTIFICATIONS } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { PriceDtoMapper } from '../../model/price.mapper';
import { UPDATE_PRICE } from '../../model/price.schema';
import { PriceEntity } from '../../model/price.type';

type UseUpdatePriceProps = BaseEditSectionProps;

const mapper = new PriceDtoMapper();

const { PRICE_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdatePrice = (props: UseUpdatePriceProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

  const [mutate] = useMutationWithAuth<UpdatePriceMutation>({
    queryToken,
    mutation: UPDATE_PRICE,
    options: {
      refetchQueries: [{ query: GET_WORK, variables: { workId } }],
      onError: () => {
        sendErrorNotification(PRICE_UPDATE_FAILED);
      },
    },
  });

  const updatePrice = (data: PriceEntity & { publicationId: PublicationId }) => {
    const dto = mapper.toDto(data);

    mutate({
      variables: { data: { ...dto, publicationId: data.publicationId } },
    });
  };

  return {
    updatePrice,
  };
};

export default useUpdatePrice;
