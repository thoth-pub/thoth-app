'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type BaseEditSectionProps, NOTIFICATIONS, QueryKeys, useServices } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { PublicationEntity } from '../../model/publication.types';

const { PUBLICATION_CREATION_FAILED } = NOTIFICATIONS;

type UseCreatePublicationProps = BaseEditSectionProps & {
  onCompleted?: (data: PublicationEntity) => void;
};

const useCreatePublication = (props: UseCreatePublicationProps) => {
  const { queryToken, workId = '', onCompleted } = props;

  const { sendErrorNotification } = useNotifications();
  const { publicationService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: PublicationEntity) => {
      return publicationService.createPublication(queryToken, data, workId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });

      onCompleted?.(data);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? PUBLICATION_CREATION_FAILED);
    },
  });

  return {
    createPublication: mutateAsync,
    loading: isPending,
  };
};

export default useCreatePublication;
