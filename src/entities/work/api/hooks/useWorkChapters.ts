'use client';

import { useQuery } from '@tanstack/react-query';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

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
    isFetching,
  } = useQuery({
    queryKey: [QueryKeys.workChapters, workId],
    queryFn: async () => workService.getWorkChapters(workId),
  });

  return { chapters: data, error, isLoading, isFetching };
};

export default useWorkChapters;
