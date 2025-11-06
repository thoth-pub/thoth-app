import { useSuspenseQuery } from '@apollo/client/react';

import type { PublisherId } from '@/src/entities/publisher';

import { GET_SERIESES_COUNT } from '../../model/series.schema';

const useSeriesesCount = (publishersIds: PublisherId[], isAdmin: boolean) => {
  const { data: { seriesCount } = { seriesCount: 0 }, error } = useSuspenseQuery(GET_SERIESES_COUNT, {
    variables: { publishers: publishersIds },
    skip: publishersIds.length === 0 && !isAdmin,
  });

  return { seriesCount, error };
};

export default useSeriesesCount;
