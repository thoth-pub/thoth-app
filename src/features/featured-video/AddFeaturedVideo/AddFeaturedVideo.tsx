'use client';

import { useState } from 'react';

import {
  EditFeaturedVideoForm,
  useCreateFeaturedVideo,
  useFeaturedVideoStateMachine,
} from '@/src/entities/featured-video';
import type { FeaturedVideoEntity } from '@/src/entities/featured-video/model/featured-video.types';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
import { TableNewEntityFormWrapper } from '@/src/shared/ui';

const AddFeaturedVideo = (props: BaseRecommendedSectionProps) => {
  const { workId } = props;

  const { activeEntity: activeFeaturedVideo, finishEditing } = useFeaturedVideoStateMachine();
  const [featuredVideo, setFeaturedVideo] = useState<FeaturedVideoEntity | null>(activeFeaturedVideo);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { createFeaturedVideo, loading, progress: uploadProgress } = useCreateFeaturedVideo({ workId });

  const handleFileUpload = (file: File) => {
    setPendingFile(file);
  };

  const create = async () => {
    if (!featuredVideo || !pendingFile) return;

    await createFeaturedVideo({ data: featuredVideo, file: pendingFile });

    finishEditing();
  };

  const updateTitle = (title: string) => {
    if (!featuredVideo) return;

    setFeaturedVideo({ ...featuredVideo, title });
  };

  const updateUrl = (url: string) => {
    if (!featuredVideo) return;

    setFeaturedVideo({ ...featuredVideo, url });
  };

  const updateWidth = (width: number) => {
    if (!featuredVideo) return;

    setFeaturedVideo({ ...featuredVideo, width });
  };

  const updateHeight = (height: number) => {
    if (!featuredVideo) return;

    setFeaturedVideo({ ...featuredVideo, height });
  };

  if (!featuredVideo) return null;

  const { title, url, width, height } = featuredVideo;

  return (
    <TableNewEntityFormWrapper>
      <EditFeaturedVideoForm
        title={title}
        url={url}
        width={width}
        height={height}
        uploadLoading={loading}
        uploadProgress={uploadProgress}
        isDoneDisabled={!pendingFile || !featuredVideo?.width || !featuredVideo?.height}
        onFileUpload={handleFileUpload}
        onTitleUpdate={updateTitle}
        onUrlUpdate={updateUrl}
        onWidthUpdate={updateWidth}
        onHeightUpdate={updateHeight}
        onDone={create}
        onClose={finishEditing}
      />
    </TableNewEntityFormWrapper>
  );
};

export default AddFeaturedVideo;
