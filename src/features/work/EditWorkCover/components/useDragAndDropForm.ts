'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCopyToClipboard } from 'react-use';

import { useUpdateWorkFrontCover, useWork } from '@/src/entities/work';
import type { CoverUrlForm, WorkId } from '@/src/entities/work/model/work.types';
import { coverUrlValidationSchema } from '@/src/entities/work/model/work.validation';
import { FORM_FIELDS, NOTIFICATIONS } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';
import useIsDragStarted from '@/src/shared/hooks/useIsDragStarted';

const { COVER_URL } = FORM_FIELDS;

export const useDragAndDropForm = (workId: WorkId) => {
  const { work, loading: isWorkLoading, updateWork } = useWork(workId);

  const time = Date.now().toString();
  const defaultValue = work.coverUrl ? `${work.coverUrl}?${time}` : '';
  const isUrlCoverFilled = defaultValue && defaultValue.length > 0;
  const isDoiEmpty = !work.doi || work.doi.length === 0;

  const isDragStarted = useIsDragStarted();
  const [, copyToClipboard] = useCopyToClipboard();
  const { updateWorkFrontCover, loading } = useUpdateWorkFrontCover(workId);
  const { sendErrorNotification, sendSuccessNotification } = useNotifications();
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  const { register, handleSubmit, setValue, reset, watch } = useForm({
    reValidateMode: 'onSubmit',
    resolver: zodResolver(coverUrlValidationSchema),
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const { ref, ...fieldProps } = register(COVER_URL.name);

  const sendDoiRequiredError = () => {
    sendErrorNotification(NOTIFICATIONS.DOI_IS_REQUIRED);
  };

  const onSubmit = async (data: CoverUrlForm) => {
    if (!data.coverUrl || data.coverUrl.length === 0) return;

    if (isDoiEmpty) {
      sendDoiRequiredError();
      return;
    }

    await updateWorkFrontCover(data.coverUrl[0]);

    reset();
  };

  useEffect(() => {
    const subscription = watch(async () => {
      await handleSubmit(onSubmit)();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isDoiEmpty]);

  const dropFile = (event: React.DragEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isDoiEmpty) {
      sendDoiRequiredError();
      return;
    }

    reset();

    setValue(COVER_URL.name, event.dataTransfer.files, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const uploadFile = () => {
    if (isDoiEmpty) {
      sendDoiRequiredError();
      return;
    }

    inputRef.current?.click();
  };

  const copyCoverUrlToClipboard = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    copyToClipboard(defaultValue);
    sendSuccessNotification(NOTIFICATIONS.COVER_URL_COPY_SUCCESS);
  };

  const openRemoveDialog = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsRemoveDialogOpen(true);
  };

  const closeRemoveDialog = () => {
    setIsRemoveDialogOpen(false);
  };

  const confirmRemoveCover = async () => {
    await updateWork({ ...work, coverUrl: '' });

    setIsRemoveDialogOpen(false);
    sendSuccessNotification(NOTIFICATIONS.COVER_REMOVE_SUCCESS);
  };

  const uploadFileClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (isDoiEmpty) {
      e.preventDefault();
      e.stopPropagation();
      sendDoiRequiredError();
      return;
    }
  };

  return {
    isDragStarted,
    defaultValue,
    loading: isWorkLoading || loading,
    fieldProps,
    isUrlCoverFilled,
    inputRef,
    isRemoveDialogOpen,
    ref,
    copyCoverUrlToClipboard,
    dropFile,
    uploadFile,
    uploadFileClick,
    openRemoveDialog,
    closeRemoveDialog,
    confirmRemoveCover,
  };
};
