'use client';

import type { WorkField, WorkStatus } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { appConfig, Direction, QueryKeys } from '@/src/shared';

import { WorkType } from '../../model/work.types';
import { WorkService } from '../work.service';
import { useQuery } from '@tanstack/react-query';

type UseWorksProps = {
  publishersIds: PublisherId[];
  isAdmin: boolean;
  offset?: number;
  limit?: number;
  direction?: Direction;
  filter?: string;
  workStatus?: WorkStatus;
  workTypes?: WorkType[];
  field?: WorkField;
};

const workService = new WorkService();

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
    isAdmin = false,
  } = props;

  const {
    data: works = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: [
      QueryKeys.works,
      ...publishersIds,
      isAdmin,
      offset,
      limit,
      direction,
      filter,
      workStatus,
      workTypes,
      field,
    ],
    queryFn: () =>
      workService.getWorks({ publishersIds, offset, limit, direction, filter, workStatus, workTypes, field }),
  });

  return { works, error, loading: isLoading };
};

export default useWorks;
