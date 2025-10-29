import { SeriesId } from '@mui/x-charts/internals';

import { CreateAffiliationMutation } from '@/gql/graphql';
import { usePublisherStateMachine } from '@/src/entities/publisher';
import { NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { DELETE_SERIES, GET_SERIESES } from '../../model/series.schema';

const { SERIES_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteSeries = ({ queryToken }: { queryToken: QueryToken }) => {
  const { sendErrorNotification } = useNotifications();

  const { activePublisher } = usePublisherStateMachine();

  const publisherId = activePublisher ? [activePublisher] : [];

  const [mutate, { loading, client }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: DELETE_SERIES,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(SERIES_DELETE_FAILED);
      },
      refetchQueries: [{ query: GET_SERIESES, variables: { publishers: publisherId } }],
    },
  });

  const deleteSeries = async (seriesId: SeriesId) => {
    mutate({
      variables: { seriesId },
    });

    await client.refetchQueries({ include: 'all' });
  };

  return {
    deleteSeries,
    loading,
  };
};

export default useDeleteSeries;
