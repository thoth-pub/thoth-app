'use client';

import { useRef, useState } from 'react';

export type UseFileDropzoneOptions = {
  disabled?: boolean;
  loading?: boolean;
  onDisabledAction?: () => void;
  onFileSelect: (file: File) => void | Promise<void>;
};

const useFileDropzone = ({
  disabled = false,
  loading = false,
  onDisabledAction,
  onFileSelect,
}: UseFileDropzoneOptions) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);

  const unavailable = disabled || loading;

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleUnavailableAction = () => {
    if (disabled && !loading) onDisabledAction?.();
  };

  const processFile = (file?: File) => {
    if (unavailable) {
      handleUnavailableAction();
      clearInput();
      return;
    }

    if (!file) {
      clearInput();
      return;
    }

    try {
      // Selection is an event boundary: consumers handle domain failures in
      // their callback, while this catch prevents a rejected callback from
      // becoming an unhandled promise.
      void Promise.resolve(onFileSelect(file)).catch(() => undefined);
    } finally {
      clearInput();
    }
  };

  const browse = () => {
    if (unavailable) {
      handleUnavailableAction();
      return;
    }

    inputRef.current?.click();
  };

  const onInputClick = (event: React.MouseEvent<HTMLInputElement>) => {
    if (!unavailable) return;

    event.preventDefault();
    event.stopPropagation();
    handleUnavailableAction();
  };

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFile(event.currentTarget.files?.[0]);
  };

  const onDragEnter = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (unavailable) return;

    dragDepth.current += 1;
    if (dragDepth.current === 1) setIsDragActive(true);
  };

  const onDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onDragLeave = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragActive(false);
  };

  const onDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    dragDepth.current = 0;
    setIsDragActive(false);
    processFile(event.dataTransfer.files?.[0]);
  };

  return {
    inputRef,
    isDragActive,
    unavailable,
    clearInput,
    browse,
    onInputClick,
    onInputChange,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  };
};

export default useFileDropzone;
