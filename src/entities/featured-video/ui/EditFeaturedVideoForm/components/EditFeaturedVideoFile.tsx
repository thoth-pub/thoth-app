'use client';

import { appConfig } from '@/src/shared/config';
import { ERRORS, NOTIFICATIONS } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { HostedFileField, TranslatedContent } from '@/src/shared/ui';

import { featuredVideoFileValidationSchema } from '../../../model/featured-video.validation';

const { FEATURED_VIDEO_UPLOAD_FILE_DISABLED } = NOTIFICATIONS;
const { supportedVideoFileTypes } = appConfig;

type EditFeaturedVideoFileProps = {
  disabled: boolean;
  loading: boolean;
  fileUrl?: string;
  pendingFileName?: string;
  progress?: number | null;
  onSubmit?: (file: File) => void | Promise<void>;
};

const EditFeaturedVideoFile = ({
  disabled,
  loading,
  fileUrl,
  pendingFileName,
  progress,
  onSubmit,
}: EditFeaturedVideoFileProps) => {
  const { sendErrorNotification } = useNotifications();

  const onDisabledClick = () => {
    sendErrorNotification(FEATURED_VIDEO_UPLOAD_FILE_DISABLED);
  };

  const onFileSelect = (file: File) => {
    const result = featuredVideoFileValidationSchema.safeParse({ file: [file] });

    if (!result.success) {
      sendErrorNotification(result.error.issues[0]?.message ?? ERRORS.FILE_FORMAT_INVALID);
      return;
    }

    const submission = onSubmit?.(file);
    if (submission) void submission.catch(() => undefined);
  };

  return (
    <HostedFileField
      accept={supportedVideoFileTypes}
      disabled={disabled}
      fileUrl={fileUrl}
      label={<TranslatedContent content="featuredVideoFile.label" namespace={NAMESPACES.enum.forms} />}
      loading={loading}
      pendingFileName={pendingFileName}
      pendingMessage={<TranslatedContent content="featuredVideoFile.pending" namespace={NAMESPACES.enum.forms} />}
      progress={progress}
      onFileSelect={onFileSelect}
      onDisabledAction={onDisabledClick}
    />
  );
};

export default EditFeaturedVideoFile;
