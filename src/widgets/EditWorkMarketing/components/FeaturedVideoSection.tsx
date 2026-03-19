'use client';

import { useActivePublisherPermissions } from '@/src/entities/publisher';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { AddButton, TranslatedContent, Typography } from '@/src/shared/ui';

import { FeaturedVideoPreview } from '../../../entities/featured-video/ui/FeaturedVideoPreview/FeaturedVideoPreview';
import AddFeaturedVideo from '../../../features/featured-video/AddFeaturedVideo/AddFeaturedVideo';
import EditFeaturedVideo from '../../../features/featured-video/EditFeaturedVideo/EditFeaturedVideo';
import { useEditFeaturedVideo } from '../hooks/useEditFeaturedVideo';

type FeaturedVideoSectionProps = {
  workId: WorkId;
};

export const FeaturedVideoSection = ({ workId }: FeaturedVideoSectionProps) => {
  const {
    featuredVideo,
    activeFeaturedVideo,
    isNew,
    editDisabled,
    loading,
    fetching,
    deleteLoading,
    editFeaturedVideo,
    addFeaturedVideo,
    deleteFeaturedVideo,
  } = useEditFeaturedVideo(workId);
  const { isFeaturedVideoEditable } = useActivePublisherPermissions();

  const isEditing = !!activeFeaturedVideo && !isNew;

  if (!isFeaturedVideoEditable) return null;

  return (
    <>
      <Typography variant="h2" className="pl-4">
        <TranslatedContent content="featured video" />
      </Typography>
      {featuredVideo && !isNew && !isEditing && (
        <FeaturedVideoPreview
          featuredVideo={featuredVideo}
          editDisabled={editDisabled || loading || fetching}
          deleteLoading={deleteLoading}
          onDelete={deleteFeaturedVideo}
          onEdit={editFeaturedVideo}
        />
      )}
      {isEditing && <EditFeaturedVideo workId={workId} />}
      {isNew && <AddFeaturedVideo workId={workId} />}
      {!featuredVideo && !isNew && (
        <AddButton className="px-4 capitalize" onAdd={addFeaturedVideo} disabled={editDisabled}>
          <TranslatedContent content="actions.addFeaturedVideo" />
        </AddButton>
      )}
    </>
  );
};
