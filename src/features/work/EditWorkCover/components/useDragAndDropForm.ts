'use client';

import { useMemo, useState } from 'react';
import { useCopyToClipboard } from 'react-use';

import { useUpdateWorkFrontCover, useWork } from '@/src/entities/work';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { coverUrlValidationSchema } from '@/src/entities/work/model/work.validation';
import { ERRORS, FORM_FIELDS, NOTIFICATIONS } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';
import useFileDropzone from '@/src/shared/ui/core/FileDropzone/useFileDropzone';

const { COVER_URL } = FORM_FIELDS;

export const useDragAndDropForm = (workId: WorkId) => {
  const { work, loading: isWorkLoading, updateWork } = useWork(workId);

  const [, copyToClipboard] = useCopyToClipboard();
  const { updateWorkFrontCover, loading } = useUpdateWorkFrontCover(workId);
  const { sendErrorNotification, sendSuccessNotification } = useNotifications();
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  const isDoiEmpty = !work.doi || work.doi.length === 0;
  const isUrlCoverFilled = Boolean(work.coverUrl);
  const isLoading = isWorkLoading || loading;

  // Stable cover URL: recompute only when the cover URL changes or the
  // cache-buster is bumped (which happens only after a successful upload).
  // Unrelated re-renders — e.g. drag-state changes — must not alter the URL,
  // otherwise the <Image> would reload repeatedly.
  const [cacheBuster, setCacheBuster] = useState(() => Date.now());
  const displayedCoverUrl = useMemo(
    () => (work.coverUrl ? `${work.coverUrl}?${cacheBuster}` : ''),
    [work.coverUrl, cacheBuster],
  );

  const sendDoiRequiredError = () => {
    sendErrorNotification(NOTIFICATIONS.DOI_IS_REQUIRED);
  };

  // Single, one-shot processor for a selected or dropped file. It validates
  // exactly once, uploads at most once, and always catches upload rejections.
  const processCoverFile = async (file: File): Promise<void> => {
    const validation = await coverUrlValidationSchema.safeParseAsync({ [COVER_URL.name]: [file] });
    if (!validation.success) {
      const message = validation.error.issues[0]?.message ?? ERRORS.FILE_FORMAT_INVALID;
      sendErrorNotification(message);
      return;
    }

    try {
      await updateWorkFrontCover(file);
      // Refresh the displayed cover only after a successful upload.
      setCacheBuster(Date.now());
    } catch {
      // The API error is surfaced by useUpdateWorkFrontCover's mutation onError;
      // swallow the rejection here to avoid an unhandled promise and a duplicate
      // notification.
    }
  };

  const {
    inputRef,
    isDragActive,
    browse: uploadFile,
    onInputClick: uploadFileClick,
    onInputChange: onFileInputChange,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop: dropFile,
  } = useFileDropzone({
    disabled: isDoiEmpty,
    loading: isLoading,
    onDisabledAction: sendDoiRequiredError,
    onFileSelect: processCoverFile,
  });

  const copyCoverUrlToClipboard = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    copyToClipboard(work.coverUrl ?? '');
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

  return {
    isDragActive,
    displayedCoverUrl,
    loading: isLoading,
    isUrlCoverFilled,
    inputRef,
    isRemoveDialogOpen,
    onFileInputChange,
    onDragEnter,
    onDragOver,
    onDragLeave,
    dropFile,
    uploadFile,
    uploadFileClick,
    copyCoverUrlToClipboard,
    openRemoveDialog,
    closeRemoveDialog,
    confirmRemoveCover,
  };
};
