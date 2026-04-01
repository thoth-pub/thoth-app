import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PublisherId } from '@/src/entities/publisher';
import { useUser } from '@/src/entities/user';
import { QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';

import { type ImprintEntity } from '../../model/imprint.types';

const useUpdateImprint = () => {
  const { imprintService } = useServices();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ entity, publisherId }: { entity: ImprintEntity; publisherId: PublisherId }) => {
      return imprintService.updateImprint(entity, publisherId, user.isSuperuser);
    },
  });

  const updateImprint = async ({ entity, publisherId }: { entity: ImprintEntity; publisherId: PublisherId }) => {
    await mutateAsync({ entity, publisherId });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.publisherImprints, publisherId] });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.userInfo] });
  };

  return {
    updateImprint,
    loading: isPending,
  };
};

export default useUpdateImprint;
