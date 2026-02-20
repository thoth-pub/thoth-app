'use client';

import { skipToken, useQuery } from '@tanstack/react-query';

import { getDefaultWork, isDefaultId, QueryKeys, useServices } from '@/src/shared';

import type { WorkId } from '../../model/work.types';

const useGetWork = (workId: WorkId) => {
  const isValidId = workId.length > 0 && !isDefaultId(workId);

  const { workService } = useServices();

  const {
    data = getDefaultWork(),
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: [QueryKeys.work, workId],
    queryFn: isValidId ? () => workService.getWork(workId) : skipToken,
  });

  return { work: data, isLoading, isFetching, error };
};

export default useGetWork;
