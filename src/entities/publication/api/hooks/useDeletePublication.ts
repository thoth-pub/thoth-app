import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type BaseEditSectionProps, QueryKeys, useServices } from '@/src/shared';

const useDeletePublication = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const queryClient = useQueryClient();
  const { publicationService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (publicationId: string) => {
      return publicationService.deletePublication(publicationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
  });

  return {
    deletePublication: mutateAsync,
    loading: isPending,
  };
};

export default useDeletePublication;
