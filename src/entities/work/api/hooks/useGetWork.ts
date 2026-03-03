'use client';

import { skipToken, useQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { getDefaultWork, isDefaultId } from '@/src/shared/utils';

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
