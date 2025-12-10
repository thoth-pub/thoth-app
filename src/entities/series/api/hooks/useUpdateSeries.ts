import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import { SeriesEntity } from '../../model/series.types';

const { SERIES_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdateSeries = () => {
  const { sendErrorNotification } = useNotifications();
  const { seriesService } = useServices();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: SeriesEntity) => {
      return seriesService.updateSeries(queryToken, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.series] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.seriesesCount] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? SERIES_UPDATE_FAILED);
    },
  });

  const updateSeries = async (data: SeriesEntity) => {
    await mutateAsync(data);
  };

  return {
    updateSeries,
    loading: isPending,
  };
};

export default useUpdateSeries;
