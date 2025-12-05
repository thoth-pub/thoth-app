import { QueryKeys, useServices, type BaseEditSectionProps } from '@/src/shared';

import { useMutation, useQueryClient } from '@tanstack/react-query';

const useDeletePublication = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const queryClient = useQueryClient();
  const { publicationService } = useServices();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (publicationId: string) => {
      return publicationService.deletePublication(queryToken, publicationId);
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
