import { useQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { isDefaultId } from '@/src/shared/utils';

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
