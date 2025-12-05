import { type BaseEditSectionProps, NOTIFICATIONS, QueryKeys } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { PublicationEntity } from '../../model/publication.types';
import { PublicationService } from '../publication.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { PUBLICATION_UPDATE_FAILED } = NOTIFICATIONS;

const publicationService = new PublicationService();

const useUpdatePublication = (props: BaseEditSectionProps) => {
  const { queryToken, workId = '' } = props;

  const { sendErrorNotification } = useNotifications();

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
