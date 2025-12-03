'use client';

import { useQuery, skipToken } from '@tanstack/react-query';
import type { WorkId } from '../../model/work.types';
import { getDefaultWork, isDefaultId, QueryKeys } from '@/src/shared';
import { WorkService } from '../work.service';

const workService = new WorkService();

const useGetWork = (workId: WorkId) => {
  const isValidId = workId.length > 0 && !isDefaultId(workId);

  const {
    data = getDefaultWork(),
    isLoading,
    error,
  } = useQuery({
    queryKey: [QueryKeys.work, workId],
    queryFn: isValidId ? () => workService.getWork(workId) : skipToken,
  });

  return { work: data, isLoading, error };
};

export default useGetWork;
