import { ServerError } from '@apollo/client';

import { CreateAffiliationMutation } from '@/gql/graphql';
import { NOTIFICATIONS, type QueryToken, serverErrorParser } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { SeriesDtoMapper } from '../../model/series.mapper';
import { CREATE_SERIES, GET_SERIES } from '../../model/series.schema';
import { SeriesEntity } from '../../model/series.types';

const { SERIES_CREATION_FAILED } = NOTIFICATIONS;

const mapper = new SeriesDtoMapper();

const useCreateSeries = ({ queryToken }: { queryToken: QueryToken }) => {
  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading, client }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: CREATE_SERIES,
    options: {
      onError: (error) => {
        if (ServerError.is(error)) {
          const errorMessage = serverErrorParser(error.bodyText, SERIES_CREATION_FAILED);

          sendErrorNotification(errorMessage);

          return;
        }

        sendErrorNotification(SERIES_CREATION_FAILED);
      },
    },
  });

  const createSeries = async (data: Omit<SeriesEntity, 'id' | 'updatedAt' | 'imprintName' | 'issues'>) => {
    const { seriesId, updatedAt, ...dto } = mapper.toDto({
      ...data,
      id: '',
      updatedAt: new Date().toISOString(),
      imprintName: '',
      issues: [],
    });

    mutate({
      variables: { data: { ...dto } },
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    client.refetchQueries({ include: [GET_SERIES] });
  };

  return {
    createSeries,
    loading,
  };
};

export default useCreateSeries;
