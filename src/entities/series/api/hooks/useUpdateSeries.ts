import { NOTIFICATIONS, QueryKeys, QueryToken } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { SeriesEntity } from '../../model/series.types';
import { SeriesService } from '../series.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { SERIES_UPDATE_FAILED } = NOTIFICATIONS;

const seriesService = new SeriesService();

const useUpdateSeries = ({ queryToken }: { queryToken: QueryToken }) => {
  const { sendErrorNotification } = useNotifications();

  const queryClient = useQueryClient();

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
