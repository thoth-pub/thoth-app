import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PublisherId } from '@/src/entities/publisher';
import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';

import { ImprintId } from '../../model/imprint.types';

const { IMPRINT_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteImprint = () => {
  const { sendErrorNotification } = useNotifications();
  const { imprintService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (imprintId: ImprintId) => {
      return imprintService.deleteImprint(imprintId);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? IMPRINT_DELETE_FAILED);
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
