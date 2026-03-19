'use client';

import {
  EditFeaturedVideoForm,
  useFeaturedVideoStateMachine,
  useUpdateFeaturedVideo,
  useUploadFeaturedVideoFile,
} from '@/src/entities/featured-video';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
import { TableNewEntityFormWrapper } from '@/src/shared/ui';

const EditFeaturedVideo = (props: BaseRecommendedSectionProps) => {
  const { workId } = props;

  const { activeEntity: activeFeaturedVideo, update, finishEditing } = useFeaturedVideoStateMachine();
  const { updateFeaturedVideo } = useUpdateFeaturedVideo({ workId });
  const { uploadFeaturedVideoFile, loading: uploadLoading } = useUploadFeaturedVideoFile(workId);

  const updateTitle = (title: string) => {
    if (!activeFeaturedVideo) return;

    update({ ...activeFeaturedVideo, title });
    updateFeaturedVideo({ ...activeFeaturedVideo, title });
  };

  const updateUrl = (url: string) => {
    if (!activeFeaturedVideo) return;

    update({ ...activeFeaturedVideo, url });
    updateFeaturedVideo({ ...activeFeaturedVideo, url });
  };

  const updateWidth = (width: number) => {
    if (!activeFeaturedVideo) return;

    update({ ...activeFeaturedVideo, width });
    updateFeaturedVideo({ ...activeFeaturedVideo, width });
  };

  const updateHeight = (height: number) => {
    if (!activeFeaturedVideo) return;

    update({ ...activeFeaturedVideo, height });
    updateFeaturedVideo({ ...activeFeaturedVideo, height });
  };

  const handleFileUpload = async (file: File) => {
    if (!activeFeaturedVideo) return;

    const fileUrl = await uploadFeaturedVideoFile(activeFeaturedVideo.id, file);
    const updated = { ...activeFeaturedVideo, fileUrl, url: fileUrl };
    update(updated);
    updateFeaturedVideo(updated);
  };

  if (!activeFeaturedVideo) return null;

  const { title, url, width, height, fileUrl } = activeFeaturedVideo;

  return (
    <TableNewEntityFormWrapper>
      <EditFeaturedVideoForm
        title={title}
        url={url}
        width={width}
        height={height}
        fileUrl={fileUrl}
        uploadLoading={uploadLoading}
        onFileUpload={handleFileUpload}
        onTitleUpdate={updateTitle}
        onUrlUpdate={updateUrl}
        onWidthUpdate={updateWidth}
        onHeightUpdate={updateHeight}
        onDone={finishEditing}
        onClose={finishEditing}
        isDoneDisabled={!fileUrl || !activeFeaturedVideo?.width || !activeFeaturedVideo?.height}
      />
    </TableNewEntityFormWrapper>
  );
};

export default EditFeaturedVideo;
