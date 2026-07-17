'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Image from 'next/image';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { appConfig } from '@/src/shared/config';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { Button, CircularProgress, ConfirmDialog, IconButton, TranslatedContent, Typography } from '@/src/shared/ui';

import { PlaceholderLogo } from './PlaceholderLogo';
import { useDragAndDropForm } from './useDragAndDropForm';
import { Wrapper } from './Wrapper';

type DragAndDropFormProps = {
  workId: WorkId;
};

const DragAndDropForm = (props: DragAndDropFormProps) => {
  const { workId } = props;

  const {
    isDragActive,
    displayedCoverUrl,
    loading,
    isUrlCoverFilled,
    inputRef,
    onFileInputChange,
    onDragEnter,
    onDragOver,
    onDragLeave,
    dropFile,
    uploadFile,
    uploadFileClick,
    copyCoverUrlToClipboard,
    isRemoveDialogOpen,
    openRemoveDialog,
    closeRemoveDialog,
    confirmRemoveCover,
  } = useDragAndDropForm(workId);

  return (
    <Wrapper>
      <div
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={dropFile}
        className="relative flex h-full w-full flex-col items-center justify-center gap-1"
      >
        {(!isUrlCoverFilled || isDragActive) && <PlaceholderLogo />}

        <Typography className={`text-center font-semibold ${isUrlCoverFilled ? 'opacity-0' : 'opacity-100'}`}>
          <TranslatedContent content="actions.dropCover" />
        </Typography>

        {!isDragActive && (
          <Button
            className={`${isUrlCoverFilled ? 'opacity-0' : 'opacity-100'}`}
            onClick={uploadFile}
            type="button"
            disabled={loading}
          >
            <TranslatedContent content="actions.browseFile" />
          </Button>
        )}

        {isUrlCoverFilled && !isDragActive && !loading && (
          <Image
            src={displayedCoverUrl}
            alt="Cover"
            className="absolute h-full w-full object-contain"
            fill
            unoptimized
          />
        )}

        {isUrlCoverFilled && (
          <div className="absolute top-0 right-0 z-100 flex">
            <IconButton className="h-12 w-12 p-0" onClick={copyCoverUrlToClipboard} size="large" disabled={loading}>
              <ContentCopyIcon color="primary" />
            </IconButton>
            <IconButton className="h-12 w-12 p-0" onClick={openRemoveDialog} size="large" disabled={loading}>
              <DeleteOutlineIcon color="primary" />
            </IconButton>
          </div>
        )}

        {loading && <CircularProgress />}

        <input
          type="file"
          ref={inputRef}
          onChange={onFileInputChange}
          onClick={uploadFileClick}
          className="absolute z-10 h-full w-full opacity-0"
          accept={appConfig.supportedCoverImageAccept}
          disabled={loading}
        />
      </div>
      <ConfirmDialog
        open={isRemoveDialogOpen}
        title={<TranslatedContent content="actions.removeCover" />}
        description={<TranslatedContent content="removeCoverWarning" namespace={NAMESPACES.enum.warnings} />}
        onConfirm={confirmRemoveCover}
        onCancel={closeRemoveDialog}
      />
    </Wrapper>
  );
};

export default DragAndDropForm;
