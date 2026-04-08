'use client';

import { appConfig } from '@/src/shared/config';
import { NOTIFICATIONS } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';
import { UploadFileButton } from '@/src/shared/ui';

const { FEATURED_VIDEO_UPLOAD_FILE_DISABLED } = NOTIFICATIONS;
const { supportedVideoFileTypes } = appConfig;

type EditFeaturedVideoFileProps = {
  disabled: boolean;
  loading: boolean;
  progress?: number | null;
  onSubmit?: (file: File) => void;
};

const EditFeaturedVideoFile = ({ disabled, loading, progress, onSubmit }: EditFeaturedVideoFileProps) => {
  const { sendErrorNotification } = useNotifications();

  const onDisabledClick = () => {
    sendErrorNotification(FEATURED_VIDEO_UPLOAD_FILE_DISABLED);
  };

  return (
    <UploadFileButton
      accept={supportedVideoFileTypes}
      disabled={disabled}
      loading={loading}
      progress={progress}
      onSubmit={onSubmit}
      onDisabledClick={onDisabledClick}
    />
  );
};

export default EditFeaturedVideoFile;
