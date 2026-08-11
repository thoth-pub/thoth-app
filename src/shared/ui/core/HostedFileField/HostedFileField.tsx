'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import { useCopyToClipboard } from 'react-use';

import Button from '../Button/Button';
import CircularProgress from '../CircularProgress/CircularProgress';
import FileDropzone from '../FileDropzone/FileDropzone';
import TranslatedContent from '../TranslatedContent/TranslatedContent';
import Typography from '../Typography/Typography';

export type HostedFileFieldProps = {
  accept: string[];
  // busy silently locks file selection (no disabled notification, no upload
  // presentation) while a surrounding request is in flight.
  busy?: boolean;
  disabled?: boolean;
  fileUrl?: string;
  label: React.ReactNode;
  loading?: boolean;
  pendingFileName?: string;
  pendingMessage?: React.ReactNode;
  progress?: number | null;
  onDisabledAction?: () => void;
  onFileSelect: (file: File) => void | Promise<void>;
};

const HostedFileField = ({
  accept,
  busy = false,
  disabled = false,
  fileUrl = '',
  label,
  loading = false,
  pendingFileName = '',
  pendingMessage,
  progress,
  onDisabledAction,
  onFileSelect,
}: HostedFileFieldProps) => {
  const [, copyToClipboard] = useCopyToClipboard();
  const hasHostedFile = fileUrl.length > 0;
  const hasPendingFile = pendingFileName.length > 0;
  const actionKey = hasHostedFile || hasPendingFile ? 'fileUpload.replace' : 'fileUpload.browse';

  return (
    <section className="flex flex-col gap-2" data-testid="hosted-file-field">
      <Typography component="h4" className="font-semibold text-(--color-typography)">
        {label}
      </Typography>
      <FileDropzone
        accept={accept}
        actionLabel={<TranslatedContent content={actionKey} />}
        busy={busy}
        disabled={disabled}
        dragActiveLabel={<TranslatedContent content="fileUpload.drop" />}
        loading={loading}
        onDisabledAction={onDisabledAction}
        onFileSelect={onFileSelect}
      >
        {loading ? (
          <div className="flex items-center gap-2" role="status">
            <CircularProgress
              size={22}
              value={typeof progress === 'number' ? progress : undefined}
              variant={typeof progress === 'number' ? 'determinate' : 'indeterminate'}
            />
            <Typography>
              <TranslatedContent
                content={typeof progress === 'number' ? 'fileUpload.uploadingProgress' : 'fileUpload.uploading'}
                options={{ progress }}
              />
            </Typography>
          </div>
        ) : hasHostedFile ? (
          <>
            <Typography className="font-semibold">
              <TranslatedContent content="fileUpload.uploaded" />
            </Typography>
            <Typography className="max-w-full truncate" title={fileUrl}>
              {fileUrl}
            </Typography>
            <div className="flex flex-wrap justify-center gap-1">
              <Button onClick={() => copyToClipboard(fileUrl)} startIcon={<ContentCopyIcon />} type="button">
                <TranslatedContent content="fileUpload.copyUrl" />
              </Button>
              <a
                className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-(--color-primary) hover:bg-(--color-hover-alt)"
                download={fileUrl}
                href={fileUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <DownloadIcon fontSize="small" />
                <TranslatedContent content="fileUpload.openDownload" />
              </a>
            </div>
          </>
        ) : hasPendingFile ? (
          <>
            <Typography className="font-semibold">
              <TranslatedContent content="fileUpload.selected" options={{ filename: pendingFileName }} />
            </Typography>
            <Typography>{pendingMessage ?? <TranslatedContent content="fileUpload.pending" />}</Typography>
          </>
        ) : (
          <Typography>
            <TranslatedContent content="fileUpload.instructions" />
          </Typography>
        )}
      </FileDropzone>
    </section>
  );
};

export default HostedFileField;
