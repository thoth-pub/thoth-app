'use client';

import { TableFormsHeader, TableFormsWrapper } from '@/src/shared/ui';

import DownloadAdditionalResourceFile from '../DownloadAdditionalResourceFile/DownloadAdditionalResourceFile';
import { EditAdditionalResourceAttribution } from '../EditAdditionalResourceAttribution/EditAdditionalResourceAttribution';
import { EditAdditionalResourceDescription } from '../EditAdditionalResourceDescription/EditAdditionalResourceDescription';
import { EditAdditionalResourceDoi } from '../EditAdditionalResourceDoi/EditAdditionalResourceDoi';
import EditAdditionalResourceFile from '../EditAdditionalResourceFile/EditAdditionalResourceFile';
import { EditAdditionalResourceHandle } from '../EditAdditionalResourceHandle/EditAdditionalResourceHandle';
import { EditAdditionalResourceResourceType } from '../EditAdditionalResourceResourceType/EditAdditionalResourceResourceType';
import { EditAdditionalResourceTitle } from '../EditAdditionalResourceTitle/EditAdditionalResourceTitle';
import { EditAdditionalResourceUrl } from '../EditAdditionalResourceUrl/EditAdditionalResourceUrl';

type EditAdditionalResourceFormProps = Partial<{
  title: string;
  description: string;
  attribution: string;
  resourceType: string;
  doi: string;
  handle: string;
  url: string;
  fileUrl: string;
  uploadLoading: boolean;
  onFileUpload: (file: File) => void;
  isDoneDisabled: boolean;
  onTitleUpdate: (data: string) => void;
  onDescriptionUpdate: (data: string) => void;
  onAttributionUpdate: (data: string) => void;
  onResourceTypeUpdate: (data: string) => void;
  onDoiUpdate: (data: string) => void;
  onHandleUpdate: (data: string) => void;
  onUrlUpdate: (data: string) => void;
  onDone: () => void;
  onClose: () => void;
}>;

const EditAdditionalResourceForm = (props: EditAdditionalResourceFormProps) => {
  const {
    title,
    description,
    attribution,
    resourceType,
    doi,
    handle,
    url,
    fileUrl,
    uploadLoading,
    onFileUpload,
    onTitleUpdate,
    onDescriptionUpdate,
    onAttributionUpdate,
    onResourceTypeUpdate,
    onDoiUpdate,
    onHandleUpdate,
    onUrlUpdate,
    onDone,
    onClose,
    isDoneDisabled,
  } = props;

  return (
    <TableFormsWrapper>
      <TableFormsHeader
        title="additional resource"
        controls={
          <>
            <DownloadAdditionalResourceFile fileUrl={fileUrl} />
            <EditAdditionalResourceFile
              resourceType={resourceType ?? ''}
              loading={uploadLoading ?? false}
              onSubmit={onFileUpload}
            />
          </>
        }
        onDone={onDone}
        onClose={onClose}
        isDoneDisabled={isDoneDisabled}
      />
      <EditAdditionalResourceTitle defaultValue={title} onUpdate={onTitleUpdate} />
      <EditAdditionalResourceResourceType defaultValue={resourceType} onUpdate={onResourceTypeUpdate} />
      <EditAdditionalResourceDescription defaultValue={description} onUpdate={onDescriptionUpdate} />
      <EditAdditionalResourceAttribution defaultValue={attribution} onUpdate={onAttributionUpdate} />
      <EditAdditionalResourceDoi defaultValue={doi} onUpdate={onDoiUpdate} />
      <EditAdditionalResourceHandle defaultValue={handle} onUpdate={onHandleUpdate} />
      <EditAdditionalResourceUrl defaultValue={url} onUpdate={onUrlUpdate} />
    </TableFormsWrapper>
  );
};

export default EditAdditionalResourceForm;
