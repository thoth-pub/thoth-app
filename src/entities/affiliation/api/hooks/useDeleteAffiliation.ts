import { useMutation } from '@tanstack/react-query';

import { useServices } from '@/src/shared';
import { useQueryToken } from '@/src/shared/hooks';

const useDeleteAffiliation = () => {
  const queryToken = useQueryToken();
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
