'use client';

import { useQuery } from '@tanstack/react-query';

import type { WorkField, WorkStatus } from '@/gql/graphql';
import { PublisherId } from '@/src/entities/publisher';
import { appConfig } from '@/src/shared/config';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { Direction } from '@/src/shared/types';

import { WorkType } from '../../model/work.types';

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

  const { workService } = useServices();

  const {
    data: works = [],
    error,
    isLoading,
    isFetched,
  } = useQuery({
    queryKey: [QueryKeys.works, ...publishersIds, offset, limit, direction, filter, workStatus, workTypes, field],
    queryFn: () =>
      workService.getWorks({ publishersIds, offset, limit, direction, filter, workStatus, workTypes, field }),
    enabled: publishersIds.length > 0,
  });

  return { works, error, loading: isLoading, isFetched };
};

export default useWorks;
