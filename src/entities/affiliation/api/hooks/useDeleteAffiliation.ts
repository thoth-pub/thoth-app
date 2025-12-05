import { useServices, type QueryToken } from '@/src/shared';

import { useMutation } from '@tanstack/react-query';

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
