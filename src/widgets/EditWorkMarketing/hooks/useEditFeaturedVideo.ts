'use client';

import { useDeleteFeaturedVideo, useFeaturedVideoStateMachine } from '@/src/entities/featured-video';
import type { FeaturedVideoEntity } from '@/src/entities/featured-video/model/featured-video.types';
import { useWork } from '@/src/entities/work';
import { WorkId } from '@/src/entities/work/model/work.types';
import { appConfig } from '@/src/shared/config';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { isDefaultId } from '@/src/shared/utils';

const defaultFeaturedVideo: FeaturedVideoEntity = {
  id: appConfig.defaultId,
  workId: '',
  title: '',
  url: '',
  width: 0,
  height: 0,
  fileUrl: '',
};

export const useEditFeaturedVideo = (workId: WorkId) => {
  const { work, loading, fetching } = useWork(workId);
  const { activeEntity: activeFeaturedVideo, edit } = useFeaturedVideoStateMachine();
  const { activeFormId } = useFormStateMachine();
  const { deleteFeaturedVideo: deleteFeaturedVideoMutation, loading: deleteLoading } = useDeleteFeaturedVideo({
    workId,
  });

  const featuredVideo = work.featuredVideo;
  const isNew = activeFeaturedVideo ? isDefaultId(activeFeaturedVideo.id) : false;

  const editFeaturedVideo = () => {
    if (!featuredVideo) return;

    edit({ ...featuredVideo });
  };

  const addFeaturedVideo = () => {
    edit({ ...defaultFeaturedVideo });
  };

  const deleteFeaturedVideo = async () => {
    if (!featuredVideo) return;

    await deleteFeaturedVideoMutation(featuredVideo.id);
  };

  return {
    featuredVideo,
    activeFeaturedVideo,
    isNew,
    editDisabled: !!activeFormId,
    loading,
    fetching,
    deleteLoading,
    editFeaturedVideo,
    addFeaturedVideo,
    deleteFeaturedVideo,
  };
};
