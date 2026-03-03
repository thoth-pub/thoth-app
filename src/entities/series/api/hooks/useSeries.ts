import { useQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

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
    isFetching,
  } = useQuery({
    queryKey: [QueryKeys.series, seriesId],
    queryFn: () => seriesService.getSeries(seriesId),
    enabled: seriesId.length > 0,
  });

  return { series, error, loading: isLoading, fetching: isFetching };
};

export default useSeries;
