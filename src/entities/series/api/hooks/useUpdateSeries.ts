import { ServerError } from '@apollo/client';

import { CreateAffiliationMutation } from '@/gql/graphql';
import { NOTIFICATIONS, QueryToken, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { SeriesDtoMapper } from '../../model/series.mapper';
import { GET_SERIES, UPDATE_SERIES } from '../../model/series.schema';
import { SeriesEntity } from '../../model/series.types';

const { SERIES_UPDATE_FAILED } = NOTIFICATIONS;

const mapper = new SeriesDtoMapper();

const useUpdateSeries = ({ queryToken }: { queryToken: QueryToken }) => {
  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: UPDATE_SERIES,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, SERIES_UPDATE_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(SERIES_UPDATE_FAILED);
      },
      refetchQueries: [{ query: GET_SERIES }],
    },
  });

  const updateSeries = (data: SeriesEntity) => {
    const dto = mapper.toDto(data);

    mutate({
      variables: { data: dto },
    });
  };

  return {
    updateSeries,
    loading,
  };
};

export default useUpdateSeries;
