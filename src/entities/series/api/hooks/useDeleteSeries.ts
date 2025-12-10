import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import { SeriesId } from '../../model/series.types';

const { SERIES_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteSeries = () => {
  const { sendErrorNotification } = useNotifications();
  const { seriesService } = useServices();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

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
