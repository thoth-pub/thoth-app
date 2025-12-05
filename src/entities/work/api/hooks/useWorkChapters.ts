'use client';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { QueryKeys, useServices } from '@/src/shared';
import { useQuery } from '@tanstack/react-query';

type UseChaptersProps = {
  workId: WorkId;
};

const useWorkChapters = (props: UseChaptersProps) => {
  const { workId = '' } = props;

  const { workService } = useServices();

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
