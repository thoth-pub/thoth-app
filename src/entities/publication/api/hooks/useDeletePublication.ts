import { QueryKeys, type BaseEditSectionProps } from '@/src/shared';

import { PublicationService } from '../publication.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const publicationService = new PublicationService();

const useDeletePublication = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const queryClient = useQueryClient();

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
