import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PublisherId } from '@/src/entities/publisher';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

import { ImprintId } from '../../model/imprint.types';

const useDeleteImprint = () => {
  const { imprintService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (imprintId: ImprintId) => {
      return imprintService.deleteImprint(imprintId);
    },
  });

  const deleteImprint = async ({ imprintId, publisherId }: { imprintId: ImprintId; publisherId: PublisherId }) => {
    await mutateAsync(imprintId);

    queryClient.invalidateQueries({ queryKey: [QueryKeys.publisherImprints, publisherId] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.userInfo] });
  };

  return {
    deleteImprint,
    loading: isPending,
  };
};

export default useDeleteImprint;
