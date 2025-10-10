import { useSuspenseQuery } from '@apollo/client/react';

import type { PublisherId } from '@/src/entities/publisher';

import { GET_SERIES_COUNT } from '../../model/series.schema';

const useSeriesCount = (publishersIds: PublisherId[]) => {
  const { data: { seriesCount } = { seriesCount: 0 }, error } = useSuspenseQuery(GET_SERIES_COUNT, {
    variables: { publishers: publishersIds },
    skip: publishersIds.length === 0,
  });

  return { seriesCount, error };
};

export default useSeriesCount;
