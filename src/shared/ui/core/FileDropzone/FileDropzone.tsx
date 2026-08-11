'use client';

import AddIcon from '@mui/icons-material/Add';

import { mergeStyles } from '@/src/shared/utils';

import Button from '../Button/Button';
import Typography from '../Typography/Typography';
import useFileDropzone from './useFileDropzone';

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
  const { inputRef, isDragActive, unavailable, browse, onInputChange, onDragEnter, onDragOver, onDragLeave, onDrop } =
    useFileDropzone({ disabled, loading, onDisabledAction, onFileSelect });

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
