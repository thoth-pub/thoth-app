import { useSuspenseQuery } from '@apollo/client/react';

import type { WorkFragmentFragment } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';

import { WorkDtoMapper } from '../../model/work.mapper';
import { GET_WORKS } from '../../model/work.schema';

const mapper = new WorkDtoMapper();

const useWorks = (publishersIds: PublisherId[]) => {
  const { data: { works } = { works: [] }, error } = useSuspenseQuery(GET_WORKS, {
    variables: { publishers: publishersIds },
    skip: publishersIds.length === 0,
  });

  const data = works.map((work) => mapper.toEntity(work as WorkFragmentFragment));

  return { works: data, error };
};

export default useWorks;
