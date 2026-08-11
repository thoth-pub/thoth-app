'use client';

import {
  EditAdditionalResourceForm,
  useAdditionalResourceStateMachine,
  useUpdateAdditionalResource,
  useUploadAdditionalResourceFile,
} from '@/src/entities/additional-resource';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';

const EditAdditionalResource = (props: BaseRecommendedSectionProps) => {
  const { workId } = props;

  const { activeEntity: activeAdditionalResource, update, finishEditing } = useAdditionalResourceStateMachine();
  const { updateAdditionalResource } = useUpdateAdditionalResource({ workId });
  const {
    uploadAdditionalResourceFile,
    loading: uploadLoading,
    progress: uploadProgress,
  } = useUploadAdditionalResourceFile(workId);

  const updateTitle = (title: string) => {
    if (!activeAdditionalResource) return;

    update({ ...activeAdditionalResource, title });
    updateAdditionalResource({ ...activeAdditionalResource, title });
  };

  const updateDescription = (description: string) => {
    if (!activeAdditionalResource) return;

    update({ ...activeAdditionalResource, description });
    updateAdditionalResource({ ...activeAdditionalResource, description });
  };

  const updateAttribution = (attribution: string) => {
    if (!activeAdditionalResource) return;

    update({ ...activeAdditionalResource, attribution });
    updateAdditionalResource({ ...activeAdditionalResource, attribution });
  };

  const updateResourceType = (resourceType: string) => {
    if (!activeAdditionalResource) return;

    update({ ...activeAdditionalResource, resourceType });
    updateAdditionalResource({ ...activeAdditionalResource, resourceType });
  };

  const updateDoi = (doi: string) => {
    if (!activeAdditionalResource) return;

    update({ ...activeAdditionalResource, doi });
    updateAdditionalResource({ ...activeAdditionalResource, doi });
  };

  const updateHandle = (handle: string) => {
    if (!activeAdditionalResource) return;

    update({ ...activeAdditionalResource, handle });
    updateAdditionalResource({ ...activeAdditionalResource, handle });
  };

  const updateUrl = (url: string) => {
    if (!activeAdditionalResource) return;

    update({ ...activeAdditionalResource, url });
    updateAdditionalResource({ ...activeAdditionalResource, url });
  };

  const handleFileUpload = async (file: File) => {
    if (!activeAdditionalResource) return;

    const fileUrl = await uploadAdditionalResourceFile(activeAdditionalResource.id, file);
    const updated = { ...activeAdditionalResource, fileUrl };
    update(updated);
    updateAdditionalResource(updated);
  };

  if (!activeAdditionalResource) return null;

  const { title, description, attribution, resourceType, doi, handle, url, fileUrl } = activeAdditionalResource;

  return (
    <EditAdditionalResourceForm
      title={title}
      description={description}
      attribution={attribution}
      resourceType={resourceType}
      doi={doi}
      handle={handle}
      url={url}
      fileUrl={fileUrl}
      uploadLoading={uploadLoading}
      uploadProgress={uploadProgress}
      isCloseDisabled={uploadLoading}
      onFileUpload={handleFileUpload}
      isDoneDisabled={!title?.trim() || !resourceType?.trim()}
      onTitleUpdate={updateTitle}
      onDescriptionUpdate={updateDescription}
      onAttributionUpdate={updateAttribution}
      onResourceTypeUpdate={updateResourceType}
      onDoiUpdate={updateDoi}
      onHandleUpdate={updateHandle}
      onUrlUpdate={updateUrl}
      onDone={finishEditing}
      onClose={finishEditing}
    />
  );
};

export default EditAdditionalResource;
