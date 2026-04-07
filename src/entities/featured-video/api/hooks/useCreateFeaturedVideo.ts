'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications, usePreventInteraction, usePreventNavigation, useProgress } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import { FeaturedVideoEntity } from '../../model/featured-video.types';

const { FEATURED_VIDEO_CREATION_FAILED } = NOTIFICATIONS;

const useCreateFeaturedVideo = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { featuredVideoService } = useServices();
  const queryClient = useQueryClient();
  const { progress, setProgress, startProgress, resetProgress } = useProgress();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ data, file }: { data: FeaturedVideoEntity; file: File }) => {
      startProgress();
      return featuredVideoService.createFeaturedVideo(data, workId, file, setProgress);
    },
    onSettled: resetProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    },
    onError: (error) => {
      sendErrorNotification(error?.message ?? FEATURED_VIDEO_CREATION_FAILED);
    },
  });

  usePreventNavigation(isPending);
  usePreventInteraction(isPending);

  return {
    createFeaturedVideo: mutateAsync,
    loading: isPending,
    progress,
  };
};

export default useCreateFeaturedVideo;
