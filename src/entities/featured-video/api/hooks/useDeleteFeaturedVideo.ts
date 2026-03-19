'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS, QueryKeys } from '@/src/shared/constants';
import { useServices } from '@/src/shared/context';
import { useNotifications } from '@/src/shared/hooks';
import type { BaseEditSectionProps } from '@/src/shared/types';

import type { FeaturedVideoId } from '../../model/featured-video.types';

const { FEATURED_VIDEO_DELETE_FAILED } = NOTIFICATIONS;

const useDeleteFeaturedVideo = (props: BaseEditSectionProps) => {
  const { workId = '' } = props;

  const { sendErrorNotification } = useNotifications();
  const { featuredVideoService } = useServices();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (featuredVideoId: FeaturedVideoId) => {
      return featuredVideoService.deleteFeaturedVideo(featuredVideoId);
    },
  });

  const deleteFeaturedVideo = async (featuredVideoId: FeaturedVideoId) => {
    try {
      await mutateAsync(featuredVideoId);
    } catch {
      sendErrorNotification(FEATURED_VIDEO_DELETE_FAILED);
    } finally {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.work, workId] });
    }
  };

  return {
    deleteFeaturedVideo: deleteFeaturedVideo,
    loading: isPending,
  };
};

export default useDeleteFeaturedVideo;
