import { type QueryToken } from '@/src/shared';

import { useMutation } from '@tanstack/react-query';
import { AffiliationService } from '../affiliation.service';

type UseDeleteAffiliationProps = {
  queryToken: QueryToken;
};

const affiliationService = new AffiliationService();

const useDeleteAffiliation = (props: UseDeleteAffiliationProps) => {
  const { queryToken } = props;

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (affiliationId: string) => {
      return affiliationService.deleteAffiliation({ token: queryToken, affiliationId });
    },
  });

  return {
    deleteAffiliation: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteAffiliation;
