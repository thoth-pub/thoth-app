'use client';

import { useQuery } from '@tanstack/react-query';

import { QueryKeys, useServices } from '@/src/shared';

import { WorkId } from '../../model/work.types';

const useWorkTranslations = (workId: WorkId) => {
  const { workService } = useServices();

  const { data = [], isLoading } = useQuery({
    queryKey: [QueryKeys.workTranslations, workId],
    queryFn: () => workService.getWorkTranslations(workId),
  });

  const filteredTranslations = data.filter((translation) => translation.id !== workId);

  return { translations: filteredTranslations, loading: isLoading };
};

export default useWorkTranslations;
