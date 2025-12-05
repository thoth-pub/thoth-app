import { useQuery } from '@tanstack/react-query';
import type { SeriesId } from '../../model/series.types';
import { QueryKeys, useServices } from '@/src/shared';

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
