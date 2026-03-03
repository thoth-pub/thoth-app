import { useMutation } from '@tanstack/react-query';

import { useServices } from '@/src/shared/context';

const useDeleteAffiliation = () => {
  const { affiliationService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (affiliationId: string) => {
      return affiliationService.deleteAffiliation(affiliationId);
    },
  });

  return {
    deleteAffiliation: mutateAsync,
    loading: isPending,
  };
};

export default useDeleteAffiliation;
