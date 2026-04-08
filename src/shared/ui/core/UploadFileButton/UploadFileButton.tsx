'use client';

import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';

import { NOTIFICATIONS } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';

import CircularProgress from '../CircularProgress/CircularProgress';
import IconButton from '../IconButton/IconButton';

const { FILE_UPLOAD_PROGRESS } = NOTIFICATIONS;

type UploadFileButtonProps = {
  accept: string[];
  disabled?: boolean;
  loading?: boolean;
  progress?: number | null;
  onSubmit?: (file: File) => void;
  onDisabledClick?: () => void;
};

const UploadFileButton = ({
  accept,
  disabled,
  loading,
  progress,
  onSubmit,
  onDisabledClick,
}: UploadFileButtonProps) => {
  const { register, handleSubmit, reset, watch } = useForm({
    reValidateMode: 'onSubmit',
  });
  const { sendProgressNotification, dismissNotification } = useNotifications();
  const toastId = useId();

  useEffect(() => {
    if (!loading) return;

    if (progress) {
      sendProgressNotification(FILE_UPLOAD_PROGRESS, toastId, { progress });
    }

    if (progress && progress === 100) {
      dismissNotification(toastId);
    }
  }, [loading, progress]);

  const onSubmitForm = (data: Record<string, FileList>) => {
    if (!data.uploadFile || data.uploadFile.length === 0) return;

    onSubmit?.(data.uploadFile[0]);
    reset();
  };

  useEffect(() => {
    const subscription = watch(async () => {
      await handleSubmit(onSubmitForm)();
    });

    return () => {
      subscription.unsubscribe();
      dismissNotification(toastId);
    };
  }, []);

  if (loading) {
    const isProgressAvailable = !!progress;

    return (
      <CircularProgress
        size={18}
        variant={isProgressAvailable ? 'determinate' : 'indeterminate'}
        value={isProgressAvailable ? progress : undefined}
        className="mx-1 mt-2"
      />
    );
  }

  return (
    <form onClick={disabled ? onDisabledClick : undefined}>
      <IconButton tabIndex={-1} component="label" className="p-0" disabled={disabled}>
        <AttachFileIcon fontSize="small" />
        <input type="file" hidden {...register('uploadFile')} accept={accept.join(', ')} />
      </IconButton>
    </form>
  );
};

export default UploadFileButton;
