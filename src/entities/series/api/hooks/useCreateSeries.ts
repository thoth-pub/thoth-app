import { NOTIFICATIONS, QueryKeys, type QueryToken } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { SeriesEntity } from '../../model/series.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SeriesService } from '../series.service';

const { SERIES_CREATION_FAILED } = NOTIFICATIONS;

const seriesService = new SeriesService();

const useCreateSeries = ({ queryToken }: { queryToken: QueryToken }) => {
  const { sendErrorNotification } = useNotifications();

  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: SeriesEntity) => {
      return seriesService.createSeries(queryToken, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.serieses] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.seriesesCount] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? SERIES_CREATION_FAILED);
    },
  });

  const createSeries = async (data: Omit<SeriesEntity, 'id' | 'updatedAt' | 'imprintName' | 'issues'>) => {
    await mutateAsync({
      ...data,
      id: '',
      updatedAt: new Date().toISOString(),
      imprintName: '',
      issues: [],
    });
  };

  return {
    createSeries,
    loading: isPending,
  };
};

export default useCreateSeries;
