import { useQuery } from '@tanstack/react-query';

import { QueryKeys, useServices } from '@/src/shared';

import type { WorkId } from '../../model/work.types';

const useTranslatedWorks = (workId: WorkId) => {
  const { workService } = useServices();

  const { data = [], isLoading } = useQuery({
    queryKey: [QueryKeys.translatedWorks, workId],
    queryFn: () => workService.getTranslatedWorks(workId),
  });

  return { translatedWorks: data, loading: isLoading };
};

export default useTranslatedWorks;
