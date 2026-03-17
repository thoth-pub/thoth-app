'use client';

import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { appConfig } from '@/src/shared/config';
import { NOTIFICATIONS } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';
import { IconButton } from '@/src/shared/ui';

const { UPLOAD_FILE_FAILED } = NOTIFICATIONS;
const { supportedVideoFileTypes } = appConfig;

type EditFeaturedVideoFileProps = {
  disabled: boolean;
  loading: boolean;
  onSubmit?: (file: File) => void;
};

const EditFeaturedVideoFile = ({ disabled, loading, onSubmit }: EditFeaturedVideoFileProps) => {
  const { register, handleSubmit, reset, watch } = useForm({
    reValidateMode: 'onSubmit',
  });
  const { sendErrorNotification } = useNotifications();

  const onFormClick = () => {
    if (!disabled) return;
    sendErrorNotification(UPLOAD_FILE_FAILED);
  };

  const onSubmitForm = (data: Record<string, FileList>) => {
    if (!data.featuredVideoFile || data.featuredVideoFile.length === 0) return;
    const file = data.featuredVideoFile[0];

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
    <form onClick={onFormClick}>
      <IconButton loading={loading} tabIndex={-1} component="label" className="p-0" disabled={disabled}>
        <AttachFileIcon fontSize="small" />
        <input type="file" hidden {...register('featuredVideoFile')} accept={supportedVideoFileTypes.join(', ')} />
      </IconButton>
    </form>
  );
};

export default EditFeaturedVideoFile;
