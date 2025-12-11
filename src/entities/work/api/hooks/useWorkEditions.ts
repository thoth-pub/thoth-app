import { useQuery } from '@tanstack/react-query';

import { QueryKeys, useServices } from '@/src/shared';

import { WorkId } from '../../model/work.types';

const useWorkEditions = (workId: WorkId, currentEdition: number) => {
  const { workService } = useServices();

  const { data = [], isLoading } = useQuery({
    queryKey: [QueryKeys.workEditions, workId],
    queryFn: () => workService.getWorkEditions(workId),
  });

  const { data: prevEditions = [], isLoading: isPrevEditionsLoading } = useQuery({
    queryKey: [QueryKeys.workPrevEditions, workId],
    queryFn: () => workService.getWorkPrevEditions(workId),
  });

  const previousEdition = prevEditions.find((work) => work.edition === currentEdition - 1);
  const nextEdition = data.find((work) => work.edition === currentEdition + 1);
  const latestEdition = data.sort((a, b) => (b.edition ?? 1) - (a.edition ?? 1))[0] ?? null;

  return {
    previousEdition,
    nextEdition,
    latestEdition,
    loading: isLoading || isPrevEditionsLoading,
  };
};

export default useWorkEditions;
