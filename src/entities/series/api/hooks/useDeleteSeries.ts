import { NOTIFICATIONS, QueryKeys, type QueryToken } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { SeriesService } from '../series.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SeriesId } from '../../model/series.types';

const seriesService = new SeriesService();

const { SERIES_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteSeries = ({ queryToken }: { queryToken: QueryToken }) => {
  const { sendErrorNotification } = useNotifications();

  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (seriesId: SeriesId) => {
      return seriesService.deleteSeries(queryToken, seriesId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? SERIES_DELETE_FAILED);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.seriesesCount] });
    },
  });

  return {
    deleteSeries: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteSeries;
