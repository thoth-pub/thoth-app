'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Image from 'next/image';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { appConfig } from '@/src/shared';
import { Button, CircularProgress, IconButton, TranslatedContent, Typography } from '@/src/shared/ui';

import { PlaceholderLogo } from './PlaceholderLogo';
import { useDragAndDropForm } from './useDragAndDropForm';
import { Wrapper } from './Wrapper';

type DragAndDropFormProps = {
  workId: WorkId;
};

const DragAndDropForm = (props: DragAndDropFormProps) => {
  const { workId } = props;

  const {
    isDragStarted,
    defaultValue,
    loading,
    fieldProps,
    isUrlCoverFilled,
    inputRef,
    ref,
    dropFile,
    uploadFile,
    uploadFileClick,
    copyCoverUrlToClipboard,
  } = useDragAndDropForm(workId);

  return (
    <Wrapper>
      <form onDrop={dropFile} className="relative flex h-full w-full flex-col items-center justify-center gap-1">
        {(!isUrlCoverFilled || isDragStarted) && <PlaceholderLogo />}

        <Typography className={`text-center font-semibold ${defaultValue ? 'opacity-0' : 'opacity-100'}`}>
          <TranslatedContent content="actions.dropCover" />
        </Typography>

        {!isDragStarted && (
          <Button
            className={`${defaultValue ? 'opacity-0' : 'opacity-100'}`}
            onClick={uploadFile}
            type="button"
            disabled={loading}
          >
            <TranslatedContent content="actions.browseFile" />
          </Button>
        )}

        {isUrlCoverFilled && !isDragStarted && !loading && (
          <Image src={defaultValue} alt="Cover" className="absolute h-full w-full object-contain" fill unoptimized />
        )}

        {isUrlCoverFilled && (
          <IconButton
            className="absolute top-0 right-0 z-100 h-12 w-12 p-0"
            onClick={copyCoverUrlToClipboard}
            size="large"
            disabled={loading}
          >
            <ContentCopyIcon color="primary" />
          </IconButton>
        )}

        {loading && <CircularProgress />}

        <input
          type="file"
          {...fieldProps}
          ref={(e) => {
            ref(e);
            inputRef.current = e;
          }}
          onClick={uploadFileClick}
          className="absolute z-10 h-full w-full opacity-0"
          accept={appConfig.supportedImagesFileTypes.join(', ')}
          disabled={loading}
        />
      </form>
    </Wrapper>
  );
};

export default DragAndDropForm;
