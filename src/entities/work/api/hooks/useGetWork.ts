'use client';

import { useQuery, skipToken } from '@tanstack/react-query';
import type { WorkId } from '../../model/work.types';
import { getDefaultWork, isDefaultId, QueryKeys, useServices } from '@/src/shared';

const useGetWork = (workId: WorkId) => {
  const isValidId = workId.length > 0 && !isDefaultId(workId);

  const { workService } = useServices();

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
