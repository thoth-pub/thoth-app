'use client';

import { useState } from 'react';

import {
  EditFeaturedVideoForm,
  useCreateFeaturedVideo,
  useFeaturedVideoStateMachine,
  useUploadFeaturedVideoFile,
} from '@/src/entities/featured-video';
import type { FeaturedVideoEntity } from '@/src/entities/featured-video/model/featured-video.types';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
import { TableNewEntityFormWrapper } from '@/src/shared/ui';

const AddFeaturedVideo = (props: BaseRecommendedSectionProps) => {
  const { workId } = props;

  const { activeEntity: activeFeaturedVideo, finishEditing } = useFeaturedVideoStateMachine();
  const [featuredVideo, setFeaturedVideo] = useState<FeaturedVideoEntity | null>(activeFeaturedVideo);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { createFeaturedVideo } = useCreateFeaturedVideo({ workId });
  const { uploadFeaturedVideoFile, loading: uploadLoading } = useUploadFeaturedVideoFile(workId);

  const handleFileUpload = (file: File) => {
    setPendingFile(file);
  };

  const create = async () => {
    if (!featuredVideo || !pendingFile) return;

    const created = await createFeaturedVideo(featuredVideo);
    if (created) {
      await uploadFeaturedVideoFile(created.id, pendingFile);
    }
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
        uploadLoading={uploadLoading}
        onFileUpload={handleFileUpload}
        onTitleUpdate={updateTitle}
        onUrlUpdate={updateUrl}
        onWidthUpdate={updateWidth}
        onHeightUpdate={updateHeight}
        onDone={create}
        onClose={finishEditing}
        isDoneDisabled={!pendingFile || !featuredVideo?.width || !featuredVideo?.height}
      />
    </TableNewEntityFormWrapper>
  );
};

export default AddFeaturedVideo;
