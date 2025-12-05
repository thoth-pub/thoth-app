'use client';

import { type BaseEditSectionProps, NOTIFICATIONS, QueryKeys } from '@/src/shared';
import { useNotifications } from '@/src/shared/hooks';

import { PublicationEntity } from '../../model/publication.types';
import { PublicationService } from '../publication.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const { PUBLICATION_CREATION_FAILED } = NOTIFICATIONS;

type UseCreatePublicationProps = BaseEditSectionProps & {
  onCompleted?: (data: PublicationEntity) => void;
};

const publicationService = new PublicationService();

const useCreatePublication = (props: UseCreatePublicationProps) => {
  const { queryToken, workId = '', onCompleted } = props;

  const { sendErrorNotification } = useNotifications();

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
