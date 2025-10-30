import { SeriesId } from '@mui/x-charts/internals';

import { CreateAffiliationMutation } from '@/gql/graphql';
import { NOTIFICATIONS, type QueryToken } from '@/src/shared';
import { useMutationWithAuth, useNotifications } from '@/src/shared/hooks';

import { DELETE_SERIES } from '../../model/series.schema';

const { SERIES_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteSeries = ({ queryToken }: { queryToken: QueryToken }) => {
  const { sendErrorNotification } = useNotifications();

  const [mutate, { loading, client }] = useMutationWithAuth<CreateAffiliationMutation>({
    queryToken,
    mutation: DELETE_SERIES,
    options: {
      onError: (error) => {
        console.error(error);
        sendErrorNotification(SERIES_DELETE_FAILED);
      },
      onCompleted: async () => {
        await client.refetchQueries({ include: 'all' });
      },
    },
  });

  const deleteSeries = async (seriesId: SeriesId) => {
    mutate({
      variables: { seriesId },
    });
  };

  return {
    deleteSeries,
    loading,
  };
};

export default useDeleteSeries;
