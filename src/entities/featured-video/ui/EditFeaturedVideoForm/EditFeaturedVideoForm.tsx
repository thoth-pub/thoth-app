'use client';

import { TableFormsHeader, TableFormsWrapper } from '@/src/shared/ui';

import DownloadFeaturedVideo from '../DownloadFeaturedVideo/DownloadFeaturedVideo';
import EditFeaturedVideoFile from './components/EditFeaturedVideoFile';
import { EditFeaturedVideoHeight } from './components/EditFeaturedVideoHeight';
import { EditFeaturedVideoTitle } from './components/EditFeaturedVideoTitle';
import { EditFeaturedVideoUrl } from './components/EditFeaturedVideoUrl';
import { EditFeaturedVideoWidth } from './components/EditFeaturedVideoWidth';

type EditFeaturedVideoFormProps = {
  title?: string;
  url?: string;
  width?: number;
  height?: number;
  fileUrl?: string;
  uploadLoading?: boolean;
  onFileUpload?: (file: File) => void;
  onTitleUpdate?: (data: string) => void;
  onUrlUpdate?: (data: string) => void;
  onWidthUpdate?: (data: number) => void;
  onHeightUpdate?: (data: number) => void;
  onDone?: () => void;
  onClose?: () => void;
  isDoneDisabled?: boolean;
};

const EditFeaturedVideoForm = (props: EditFeaturedVideoFormProps) => {
  const {
    title,
    url,
    width,
    height,
    fileUrl,
    uploadLoading,
    onFileUpload,
    onTitleUpdate,
    onUrlUpdate,
    onWidthUpdate,
    onHeightUpdate,
    onDone,
    onClose,
    isDoneDisabled,
  } = props;

  return (
    <TableFormsWrapper>
      <TableFormsHeader
        title="featured video"
        controls={
          <>
            <DownloadFeaturedVideo fileUrl={fileUrl} />
            <EditFeaturedVideoFile disabled={false} loading={uploadLoading ?? false} onSubmit={onFileUpload} />
          </>
        }
        onDone={onDone}
        onClose={onClose}
        isDoneDisabled={isDoneDisabled}
      />
      <EditFeaturedVideoTitle defaultValue={title} onUpdate={onTitleUpdate} />
      <EditFeaturedVideoUrl defaultValue={url} onUpdate={onUrlUpdate} />
      <EditFeaturedVideoWidth defaultValue={width} onUpdate={onWidthUpdate} />
      <EditFeaturedVideoHeight defaultValue={height} onUpdate={onHeightUpdate} />
    </TableFormsWrapper>
  );
};

export default EditFeaturedVideoForm;
