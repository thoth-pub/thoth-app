'use client';

import { appConfig } from '@/src/shared/config';
import { NOTIFICATIONS } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';
import { UploadFileButton } from '@/src/shared/ui';

const { ADDITIONAL_RESOURCE_UPLOAD_FILE_DISABLED } = NOTIFICATIONS;
const { additionalResourceFileTypesByResourceType, additionalResourceUploadableTypes } = appConfig;

type EditAdditionalResourceFileProps = {
  title: string;
  resourceType: string;
  loading: boolean;
  progress?: number | null;
  onSubmit?: (file: File) => void;
};

const EditAdditionalResourceFile = ({ title, resourceType, loading, progress, onSubmit }: EditAdditionalResourceFileProps) => {
  const { sendErrorNotification } = useNotifications();

  const isUploadable = additionalResourceUploadableTypes.includes(resourceType) && !!title.trim();
  const acceptedTypes = additionalResourceFileTypesByResourceType[resourceType] ?? [];

  const onDisabledClick = () => {
    sendErrorNotification(ADDITIONAL_RESOURCE_UPLOAD_FILE_DISABLED);
  };

  return (
    <UploadFileButton
      accept={acceptedTypes}
      disabled={!isUploadable}
      loading={loading}
      progress={progress}
      onSubmit={onSubmit}
      onDisabledClick={!isUploadable ? onDisabledClick : undefined}
    />
  );
};

export default EditAdditionalResourceFile;
