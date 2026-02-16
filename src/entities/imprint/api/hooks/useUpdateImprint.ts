import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PublisherId } from '@/src/entities/publisher';
import { QueryKeys, useServices } from '@/src/shared';
import { useQueryToken } from '@/src/shared/hooks';

import { type ImprintId } from '../../model/imprint.types';

const useUpdateImprint = () => {
  const { imprintService } = useServices();
  const queryToken = useQueryToken();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, publisherId }: { data: { name: string; id: ImprintId }; publisherId: PublisherId }) => {
      return imprintService.updateImprint(queryToken, data, publisherId);
    },
  });

  const updateImprint = async ({
    data,
    publisherId,
  }: {
    data: { name: string; id: ImprintId };
    publisherId: PublisherId;
  }) => {
    await mutateAsync({ data, publisherId });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.publisherImprints, publisherId] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.userInfo] });
  };

  return {
    updateImprint,
    loading: isPending,
  };
};

export default useUpdateImprint;
