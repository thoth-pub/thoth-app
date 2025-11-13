import { ServerError } from '@apollo/client';

import type { UpdatePriceMutation } from '@/gql/graphql';
import type { PublicationId } from '@/src/entities/publication/model/publication.types';
import { GET_WORK } from '@/src/entities/work/model/work.schema';
import { type BaseEditSectionProps, NOTIFICATIONS, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { PriceDtoMapper } from '../../model/price.mapper';
import { UPDATE_PRICE } from '../../model/price.schema';
import { PriceEntity } from '../../model/price.types';

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
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, PRICE_UPDATE_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(PRICE_UPDATE_FAILED);
      },
      refetchQueries: workId && workId.length > 0 ? [{ query: GET_WORK, variables: { workId } }] : [],
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
