import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PublisherId } from '@/src/entities/publisher';
import { QueryKeys, useServices } from '@/src/shared';
import { useQueryToken } from '@/src/shared/hooks';

import { ImprintId } from '../../model/imprint.types';

const useDeleteImprint = () => {
  const { imprintService } = useServices();
  const queryToken = useQueryToken();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (imprintId: ImprintId) => {
      return imprintService.deleteImprint(queryToken, imprintId);
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
