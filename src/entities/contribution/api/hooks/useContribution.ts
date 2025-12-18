import { useQuery } from '@tanstack/react-query';

import { isDefaultId, QueryKeys, useServices } from '@/src/shared';

export const useContribution = (contributionId: string) => {
  const { contributionService } = useServices();

  const { data: contribution } = useQuery({
    queryKey: [QueryKeys.contribution, contributionId],
    queryFn: () => contributionService.getContribution(contributionId),
    enabled: contributionId.length > 0 && !isDefaultId(contributionId),
  });

  return {
    contribution,
  };
};
