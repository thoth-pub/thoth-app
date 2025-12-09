import { useQuery } from '@tanstack/react-query';

import { QueryKeys, useServices } from '@/src/shared';

import type { SeriesId } from '../../model/series.types';

type UseSeriesProps = {
  seriesId: SeriesId;
};

const useSeries = (props: UseSeriesProps) => {
  const { seriesId = '' } = props;

  const { seriesService } = useServices();

  const {
    data: series,
    error,
    isLoading,
  } = useQuery({
    queryKey: [QueryKeys.series, seriesId],
    queryFn: () => seriesService.getSeries(seriesId),
    enabled: seriesId.length > 0,
  });

  return { series, error, loading: isLoading };
};

export default useSeries;
