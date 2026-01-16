'use client';

import { useQuery } from '@tanstack/react-query';

import { isDefaultId, QueryKeys, useServices } from '@/src/shared';

import { WorkId } from '../../model/work.types';

const useWorkSet = (workId: WorkId) => {
  const { workService } = useServices();

  const { data = [], isLoading } = useQuery({
    queryKey: [QueryKeys.workSet, workId],
    queryFn: () => workService.getWorkSet(workId),
    enabled: workId.length > 0 && !isDefaultId(workId),
  });

  return {
    workSet: data,
    isLoading,
  };
};

export default useWorkSet;
