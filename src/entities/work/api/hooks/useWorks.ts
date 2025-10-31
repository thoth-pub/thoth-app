import { useQuery } from '@apollo/client/react';

import type { WorkField, WorkFragmentFragment, WorkStatus } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { appConfig, Direction } from '@/src/shared';

import { WorkDtoMapper } from '../../model/work.mapper';
import { GET_WORKS } from '../../model/work.schema';
import { WorkType } from '../../model/work.types';

const mapper = new WorkDtoMapper();

type UseWorksProps = {
  publishersIds: PublisherId[];
  offset?: number;
  limit?: number;
  direction?: Direction;
  filter?: string;
  workStatus?: WorkStatus;
  workTypes?: WorkType[];
  field?: WorkField;
};

const useWorks = (props: UseWorksProps) => {
  const {
    publishersIds,
    offset = 0,
    limit = appConfig.data.itemsPerRequestLimit,
    direction,
    filter,
    workStatus,
    workTypes,
    field,
  } = props;
  const {
    data: { works } = { works: [] },
    error,
    loading,
  } = useQuery(GET_WORKS, {
    variables: { offset, limit, publishers: publishersIds, direction, filter, workStatus, workTypes, field },
    skip: publishersIds.length === 0,
  });

  const data = works.map((work) => mapper.toEntity(work as WorkFragmentFragment));

  return { works: data, error, loading };
};

export default useWorks;
