import { useMutation } from '@tanstack/react-query';

import { type QueryToken,useServices } from '@/src/shared';

type UseDeleteAffiliationProps = {
  queryToken: QueryToken;
};

const useDeleteAffiliation = (props: UseDeleteAffiliationProps) => {
  const { queryToken } = props;

  const { affiliationService } = useServices();

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
