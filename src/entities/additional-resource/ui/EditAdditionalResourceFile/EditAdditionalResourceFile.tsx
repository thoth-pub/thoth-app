'use client';

import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { appConfig } from '@/src/shared/config';
import { NOTIFICATIONS } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';
import { IconButton } from '@/src/shared/ui';

const { UPLOAD_FILE_FAILED } = NOTIFICATIONS;
const { additionalResourceFileTypesByResourceType, additionalResourceUploadableTypes } = appConfig;

type EditAdditionalResourceFileProps = {
  resourceType: string;
  loading: boolean;
  onSubmit?: (file: File) => void;
};

const EditAdditionalResourceFile = ({ resourceType, loading, onSubmit }: EditAdditionalResourceFileProps) => {
  const { register, handleSubmit, reset, watch } = useForm({
    reValidateMode: 'onSubmit',
  });
  const { sendErrorNotification } = useNotifications();

  const isUploadable = additionalResourceUploadableTypes.includes(resourceType);
  const acceptedTypes = additionalResourceFileTypesByResourceType[resourceType] ?? [];

  const onFormClick = () => {
    if (!isUploadable) return;

    sendErrorNotification(UPLOAD_FILE_FAILED);
  };

  const onSubmitForm = (data: Record<string, FileList>) => {
    if (!data.additionalResourceFile || data.additionalResourceFile.length === 0) return;
    const file = data.additionalResourceFile[0];

    onSubmit?.(file);
    reset();
  };

  useEffect(() => {
    const subscription = watch(async () => {
      await handleSubmit(onSubmitForm)();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <form onClick={!isUploadable ? onFormClick : undefined}>
      <IconButton loading={loading} tabIndex={-1} component="label" className="p-0" disabled={!isUploadable}>
        <AttachFileIcon fontSize="small" />
        <input type="file" hidden {...register('additionalResourceFile')} accept={acceptedTypes.join(', ')} />
      </IconButton>
    </form>
  );
};

export default EditAdditionalResourceFile;
