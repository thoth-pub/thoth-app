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

  console.log(featuredVideo.fileUrl.length, featuredVideo.url.length);

  return (
    <div className="flex items-start gap-2 px-4">
      {videoSrc && (
        <video controls preload="metadata" className="max-h-48 max-w-xs rounded">
          <source src={videoSrc} />
        </video>
      )}
      <div className="flex flex-col">
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
