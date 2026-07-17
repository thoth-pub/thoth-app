'use client';

import { useMemo, useRef, useState } from 'react';
import { useCopyToClipboard } from 'react-use';

import { useUpdateWorkFrontCover, useWork } from '@/src/entities/work';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { coverUrlValidationSchema } from '@/src/entities/work/model/work.validation';
import { ERRORS, FORM_FIELDS, NOTIFICATIONS } from '@/src/shared/constants';
import { useNotifications } from '@/src/shared/hooks';

const { COVER_URL } = FORM_FIELDS;

export const useDragAndDropForm = (workId: WorkId) => {
  const { work, loading: isWorkLoading, updateWork } = useWork(workId);

  const [, copyToClipboard] = useCopyToClipboard();
  const { updateWorkFrontCover, loading } = useUpdateWorkFrontCover(workId);
  const { sendErrorNotification, sendSuccessNotification } = useNotifications();
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const isDoiEmpty = !work.doi || work.doi.length === 0;
  const isUrlCoverFilled = Boolean(work.coverUrl);

  // Stable cover URL: recompute only when the cover URL changes or the
  // cache-buster is bumped (which happens only after a successful upload).
  // Unrelated re-renders — e.g. drag-state changes — must not alter the URL,
  // otherwise the <Image> would reload repeatedly.
  const [cacheBuster, setCacheBuster] = useState(() => Date.now());
  const displayedCoverUrl = useMemo(
    () => (work.coverUrl ? `${work.coverUrl}?${cacheBuster}` : ''),
    [work.coverUrl, cacheBuster],
  );

  // Component-scoped drag state with a depth counter, so moving the pointer
  // across nested child elements does not flicker the highlight and we never
  // set state on every `dragover`.
  const [isDragActive, setIsDragActive] = useState(false);
  const dragDepth = useRef(0);

  const clearFileInput = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const sendDoiRequiredError = () => {
    sendErrorNotification(NOTIFICATIONS.DOI_IS_REQUIRED);
  };

  // Single, one-shot processor for a selected or dropped file. It validates
  // exactly once, uploads at most once, always catches upload rejections, and
  // always clears the native input so the same file can be selected again.
  const processCoverFile = async (file?: File): Promise<void> => {
    if (!file) return;

    if (isDoiEmpty) {
      sendDoiRequiredError();
      clearFileInput();
      return;
    }

    const validation = coverUrlValidationSchema.safeParse({ [COVER_URL.name]: [file] });
    if (!validation.success) {
      const message = validation.error.issues[0]?.message ?? ERRORS.FILE_FORMAT_INVALID;
      sendErrorNotification(message);
      clearFileInput();
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
    } finally {
      clearFileInput();
    }
  };

  const onFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    void processCoverFile(file);
  };

  const dropFile = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    dragDepth.current = 0;
    setIsDragActive(false);

    const file = event.dataTransfer.files?.[0];
    void processCoverFile(file);
  };

  const onDragEnter = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current += 1;
    if (dragDepth.current === 1) {
      setIsDragActive(true);
    }
  };

  const onDragOver = (event: React.DragEvent<HTMLElement>) => {
    // Required so the browser fires `drop` rather than navigating to the file.
    // Deliberately no state update here: the drag state is already correct.
    event.preventDefault();
  };

  const onDragLeave = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDragActive(false);
    }
  };

  const uploadFile = () => {
    if (isDoiEmpty) {
      sendDoiRequiredError();
      return;
    }

    inputRef.current?.click();
  };

  const uploadFileClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (isDoiEmpty) {
      e.preventDefault();
      e.stopPropagation();
      sendDoiRequiredError();
    }
  };

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
    loading: isWorkLoading || loading,
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
