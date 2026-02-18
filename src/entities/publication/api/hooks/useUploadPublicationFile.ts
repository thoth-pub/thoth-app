import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QueryKeys, useServices } from '@/src/shared';

import { PublicationId } from '../../model/publication.types';

const useUploadPublicationFile = (workId: string) => {
  const { publicationService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ publicationId, file }: { publicationId: PublicationId; file: File }) => {
      return publicationService.uploadPublicationFile(publicationId, file);
    },
  });

  const uploadPublicationFile = async (publicationId: PublicationId, file: File) => {
    await mutateAsync({ publicationId, file });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
  };

  return { uploadPublicationFile, loading: isPending };
};

export default useUploadPublicationFile;
