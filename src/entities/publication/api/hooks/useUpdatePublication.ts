import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type BaseEditSectionProps, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { PublicationEntity } from '../../model/publication.types';

const { PUBLICATION_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdatePublication = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { publicationService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: PublicationEntity) => {
      return publicationService.updatePublication(queryToken, data, workId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? PUBLICATION_UPDATE_FAILED);
    },
  });

  return {
    updatePublication: mutateAsync,
    loading: isPending,
  };
};

export default useUpdatePublication;
