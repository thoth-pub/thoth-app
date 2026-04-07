import { Activity } from 'react';

import { AccessibilityExceptionType, AccessibilityStandardType } from '@/src/shared/types';
import { TableFormsHeader, TableFormsWrapper } from '@/src/shared/ui';
import {
  isAccessibilityStandardAvailable,
  isDimensionsAvailable,
  isFileAvailable,
  isFullTextUrlAvailable,
} from '@/src/shared/utils';

import type { PublicationAccessibilityForm, PublicationDimensionsForm, PublicationType } from '../../model/publication.types';
import DownloadPublication from '../DownloadPublication/DownloadPublication';
import { EditAccessibility } from './components/EditAccessibility';
import { EditDimensions } from './components/EditDimensions';
import EditFile from './components/EditFile';
import EditIsbn from './components/EditIsbn';
import EditPublicationType from './components/EditPublicationType';

type EditPublicationProps = {
  publicationType: PublicationType;
  isbn: string;
  width: number;
  widthIn: number;
  height: number;
  heightIn: number;
  depth: number;
  depthIn: number;
  weight: number;
  weightOz: number;
  fileUrl: string;
  loading: boolean;
  accessibilityStandards: AccessibilityStandardType[];
  accessibilityException: AccessibilityExceptionType | null;
  accessibilityReportUrl: string;
  isDimensionFormHidden: boolean;
  isUploadFileFormDisabled: boolean;
  uploadProgress?: number | null;
  children?: (isFullTextUrlHidden: boolean) => Readonly<React.ReactNode>;
  onDone?: () => void;
  onClose?: () => void;
  onUpdateType?: (type: PublicationType) => void;
  onUpdateIsbn?: (isbn: string) => void;
  onUpdateDimensions?: (dimensions: PublicationDimensionsForm) => void;
  onUpdateAccessibility?: (data: PublicationAccessibilityForm) => void;
  onDeleteAccessibility?: () => void;
  onUpdateFile?: (file: File) => void;
};

const EditPublication = (props: EditPublicationProps) => {
  const {
    publicationType,
    isbn,
    width,
    widthIn,
    height,
    heightIn,
    depth,
    depthIn,
    weight,
    weightOz,
    loading,
    isDimensionFormHidden,
    accessibilityStandards = [],
    accessibilityException,
    accessibilityReportUrl,
    fileUrl,
    isUploadFileFormDisabled,
    children,
    onDone,
    onClose,
    onUpdateType,
    onUpdateIsbn,
    onUpdateDimensions,
    onUpdateAccessibility,
    onDeleteAccessibility,
    onUpdateFile,
    uploadProgress,
  } = props;

  const isDimensionsHidden = isDimensionFormHidden || !isDimensionsAvailable(publicationType);
  const isFullTextUrlHidden = !isFullTextUrlAvailable(publicationType);
  const isAccessabilitySectionAvailable = isAccessibilityStandardAvailable(publicationType);
  const isUploadFileFormHidden = !isFileAvailable(publicationType);

  return (
    <TableFormsWrapper>
      <TableFormsHeader
        title={publicationType}
        controls={
          <>
            <DownloadPublication fileUrl={fileUrl} />
            {!isUploadFileFormHidden && (
              <EditFile
                publicationType={publicationType}
                disabled={isUploadFileFormDisabled}
                loading={loading}
                progress={uploadProgress}
                onSubmit={onUpdateFile}
              />
            )}
          </>
        }
        onDone={onDone}
        onClose={onClose}
        isCloseDisabled={loading}
      />
      <EditPublicationType publicationType={publicationType} onSubmit={onUpdateType} />
      <EditIsbn isbn={isbn} onSubmit={onUpdateIsbn} />
      {!isDimensionsHidden && (
        <EditDimensions
          width={width}
          widthIn={widthIn}
          height={height}
          heightIn={heightIn}
          depth={depth}
          depthIn={depthIn}
          weight={weight}
          weightOz={weightOz}
          onSubmit={onUpdateDimensions}
        />
      )}

      {children?.(isFullTextUrlHidden)}

      <Activity mode={isAccessabilitySectionAvailable ? 'visible' : 'hidden'}>
        <EditAccessibility
          publicationType={publicationType}
          standards={accessibilityStandards}
          exception={accessibilityException}
          reportUrl={accessibilityReportUrl}
          onSubmit={onUpdateAccessibility}
          onDelete={onDeleteAccessibility}
        />
      </Activity>
    </TableFormsWrapper>
  );
};

export default EditPublication;
