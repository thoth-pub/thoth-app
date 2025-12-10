import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications, useQueryToken } from '@/src/shared/hooks';

import { SeriesEntity } from '../../model/series.types';

const { SERIES_CREATION_FAILED } = NOTIFICATIONS;

const useCreateSeries = () => {
  const { sendErrorNotification } = useNotifications();
  const { seriesService } = useServices();
  const queryClient = useQueryClient();
  const queryToken = useQueryToken();

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
