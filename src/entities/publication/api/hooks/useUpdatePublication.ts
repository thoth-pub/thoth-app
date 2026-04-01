import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import { type BaseEditSectionProps } from '@/src/shared/types';

import { PublicationEntity } from '../../model/publication.types';

const { PUBLICATION_UPDATE_FAILED } = NOTIFICATIONS;

const useUpdatePublication = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { publicationService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: PublicationEntity) => {
      return publicationService.updatePublication(data, workId);
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
