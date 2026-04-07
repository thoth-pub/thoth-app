'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications, usePreventInteraction, usePreventNavigation, useProgress } from '@/src/shared/hooks';
import { type BaseEditSectionProps } from '@/src/shared/types';

import { PublicationEntity } from '../../model/publication.types';

const { PUBLICATION_CREATION_FAILED } = NOTIFICATIONS;

type UseCreatePublicationProps = BaseEditSectionProps & {
  onCompleted?: (data: PublicationEntity) => void;
};

const useCreatePublication = (props: UseCreatePublicationProps) => {
  const { workId = '', onCompleted } = props;

  const { sendErrorNotification } = useNotifications();
  const { publicationService } = useServices();
  const queryClient = useQueryClient();
  const { progress, setProgress, startProgress, resetProgress } = useProgress();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, file }: { data: PublicationEntity; file?: File }) => {
      startProgress();
      return publicationService.createPublication(data, workId, file, setProgress);
    },
    onSettled: resetProgress,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });

      onCompleted?.(data);
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? PUBLICATION_CREATION_FAILED);
    },
  });

  usePreventNavigation(isPending);
  usePreventInteraction(isPending);

  return {
    createPublication: mutateAsync,
    loading: isPending,
    progress,
  };
};

export default useCreatePublication;
