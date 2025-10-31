import { useSuspenseQuery } from '@apollo/client/react';

import type { WorkFragmentFragment } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { appConfig } from '@/src/shared';

import { WorkDtoMapper } from '../../model/work.mapper';
import { GET_WORKS } from '../../model/work.schema';

const mapper = new WorkDtoMapper();

const useSuspendedWorks = (publishersIds: PublisherId[], offset = 0, limit = appConfig.data.itemsPerRequestLimit) => {
  const { data: { works } = { works: [] }, error } = useSuspenseQuery(GET_WORKS, {
    variables: { offset, limit, publishers: publishersIds },
    skip: publishersIds.length === 0,
  });

  const data = works.map((work) => mapper.toEntity(work as WorkFragmentFragment));

  return { works: data, error };
};

export default useSuspendedWorks;
