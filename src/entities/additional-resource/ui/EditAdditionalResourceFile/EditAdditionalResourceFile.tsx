'use client';

import { appConfig } from '@/src/shared/config';
import { ERRORS, NOTIFICATIONS } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { HostedFileField, TranslatedContent } from '@/src/shared/ui';

import {
  getAdditionalResourceFileValidationSchema,
  getSupportedAdditionalResourceFileTypes,
} from '../../model/additional-resource.validation';

const { ADDITIONAL_RESOURCE_UPLOAD_FILE_DISABLED } = NOTIFICATIONS;
const { additionalResourceUploadableTypes } = appConfig;

type EditAdditionalResourceFileProps = {
  title: string;
  resourceType: string;
  loading: boolean;
  fileUrl?: string;
  pendingFileName?: string;
  progress?: number | null;
  onSubmit?: (file: File) => void | Promise<void>;
};

const EditAdditionalResourceFile = ({
  title,
  resourceType,
  loading,
  fileUrl,
  pendingFileName,
  progress,
  onSubmit,
}: EditAdditionalResourceFileProps) => {
  const { sendErrorNotification } = useNotifications();

  const isUploadable = additionalResourceUploadableTypes.includes(resourceType) && !!title.trim();
  const acceptedTypes = getSupportedAdditionalResourceFileTypes(resourceType);

  const onDisabledClick = () => {
    sendErrorNotification(ADDITIONAL_RESOURCE_UPLOAD_FILE_DISABLED);
  };

  const onFileSelect = (file: File) => {
    const result = getAdditionalResourceFileValidationSchema(resourceType).safeParse({ file: [file] });

    if (!result.success) {
      sendErrorNotification(result.error.issues[0]?.message ?? ERRORS.FILE_FORMAT_INVALID);
      return;
    }

    const submission = onSubmit?.(file);
    if (submission) void submission.catch(() => undefined);
  };

  return (
    <HostedFileField
      accept={acceptedTypes}
      disabled={!isUploadable}
      fileUrl={fileUrl}
      label={<TranslatedContent content="additionalResourceFile.label" namespace={NAMESPACES.enum.forms} />}
      loading={loading}
      pendingFileName={pendingFileName}
      pendingMessage={<TranslatedContent content="additionalResourceFile.pending" namespace={NAMESPACES.enum.forms} />}
      progress={progress}
      onFileSelect={onFileSelect}
      onDisabledAction={!isUploadable ? onDisabledClick : undefined}
    />
  );
};

export default EditAdditionalResourceFile;
