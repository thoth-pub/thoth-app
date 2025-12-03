'use client';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { QueryKeys } from '@/src/shared';
import { useQuery } from '@tanstack/react-query';
import { WorkService } from '../work.service';

type UseChaptersProps = {
  workId: WorkId;
};

const workService = new WorkService();

const useWorkChapters = (props: UseChaptersProps) => {
  const { workId = '' } = props;

  const {
    data = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: [QueryKeys.workChapters, workId],
    queryFn: async () => workService.getWorkChapters(workId),
  });

  return { chapters: data, error, isLoading };
};

export default useWorkChapters;
