import { useSuspenseQuery } from '@apollo/client/react';

import type { PublisherId } from '@/src/entities/publisher';

import { GET_WORKS_COUNT } from '../../model/work.schema';

const useWorksCount = (publishersIds: PublisherId[]) => {
  const { data: { workCount } = { workCount: 0 }, error } = useSuspenseQuery(GET_WORKS_COUNT, {
    variables: { publishers: publishersIds },
    skip: publishersIds.length === 0,
  });

  return { workCount, error };
};

export default useWorksCount;
