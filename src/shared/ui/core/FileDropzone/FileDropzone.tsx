'use client';

import AddIcon from '@mui/icons-material/Add';
import { useRef, useState } from 'react';

import { mergeStyles } from '@/src/shared/utils';

import Button from '../Button/Button';
import Typography from '../Typography/Typography';

export type FileDropzoneProps = {
  accept: string[];
  actionLabel: React.ReactNode;
  dragActiveLabel: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onDisabledAction?: () => void;
  onFileSelect: (file: File) => void | Promise<void>;
};

const FileDropzone = ({
  accept,
  actionLabel,
  dragActiveLabel,
  children,
  className,
  disabled = false,
  loading = false,
  onDisabledAction,
  onFileSelect,
}: FileDropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);

  const unavailable = disabled || loading;

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = '';
  };

  const processFile = (file?: File) => {
    if (unavailable) {
      if (disabled) onDisabledAction?.();
      clearInput();
      return;
    }

    if (!file) {
      clearInput();
      return;
    }

    try {
      void onFileSelect(file);
    } finally {
      clearInput();
    }
  };

  const browse = () => {
    if (unavailable) {
      if (disabled) onDisabledAction?.();
      return;
    }

    inputRef.current?.click();
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

  return (
    <div
      className={mergeStyles(
        `flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-center transition-colors ${
          isDragActive ? 'border-(--color-primary) bg-(--color-hover-alt)' : 'border-(--color-form-border)'
        } ${unavailable ? 'opacity-60' : ''}`,
        className,
      )}
      data-drag-active={isDragActive}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isDragActive ? <Typography className="font-semibold">{dragActiveLabel}</Typography> : children}
      {!isDragActive && (
        <Button
          aria-disabled={unavailable}
          disabled={loading}
          onClick={browse}
          startIcon={<AddIcon />}
          type="button"
          variant="outlined"
        >
          {actionLabel}
        </Button>
      )}
      <input
        ref={inputRef}
        accept={accept.join(',')}
        className="hidden"
        disabled={unavailable}
        onChange={onInputChange}
        type="file"
      />
    </div>
  );
};

export default FileDropzone;
