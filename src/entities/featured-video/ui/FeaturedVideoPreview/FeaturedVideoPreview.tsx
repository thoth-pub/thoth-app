'use client';

import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

import { IconButton } from '@/src/shared/ui';

import type { FeaturedVideoEntity } from '../../model/featured-video.types';

type FeaturedVideoPreviewProps = {
  featuredVideo: FeaturedVideoEntity;
  editDisabled?: boolean;
  deleteLoading?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
};

export const FeaturedVideoPreview = (props: FeaturedVideoPreviewProps) => {
  const { featuredVideo, editDisabled = false, deleteLoading = false, onDelete, onEdit } = props;

  const videoSrc = featuredVideo.fileUrl || featuredVideo.url;

  return (
    <div className="relative flex items-start gap-2 px-4">
      {videoSrc && (
        <video
          controls
          preload="metadata"
          className="w-full rounded"
          style={{ aspectRatio: `${featuredVideo.width} / ${featuredVideo.height}` }}
        >
          <source src={videoSrc} />
        </video>
      )}
      <div className="absolute top-0 right-4 flex flex-col bg-white">
        <IconButton size="small" onClick={() => onEdit?.()} disabled={editDisabled} aria-label="Edit featured video">
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onDelete?.()}
          disabled={deleteLoading}
          aria-label="Delete featured video"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  );
};
