'use client';

import {
  useAdditionalResourceStateMachine,
  useDeleteAdditionalResource,
  useMoveAdditionalResource,
} from '@/src/entities/additional-resource';
import type { AdditionalResourceEntity } from '@/src/entities/additional-resource/model/additional-resource.types';
import { useWork } from '@/src/entities/work';
import { WorkId } from '@/src/entities/work/model/work.types';
import { appConfig } from '@/src/shared/config';
import useFormStateMachine from '@/src/shared/store/forms/hooks/useFormStateMachine';
import { isDefaultId } from '@/src/shared/utils';

const defaultAdditionalResource: AdditionalResourceEntity = {
  id: appConfig.defaultId,
  workId: '',
  title: '',
  description: '',
  attribution: '',
  resourceType: '',
  doi: '',
  handle: '',
  url: '',
  fileUrl: '',
  orderNumber: 0,
};

export const useEditAdditionalResources = (workId: WorkId) => {
  const { work, loading, fetching } = useWork(workId);
  const { activeEntity: activeAdditionalResource, edit } = useAdditionalResourceStateMachine();
  const { activeFormId } = useFormStateMachine();
  const { deleteAdditionalResource: deleteAdditionalResourceMutation, loading: deleteLoading } =
    useDeleteAdditionalResource({ workId });
  const { moveAdditionalResource } = useMoveAdditionalResource({ workId });

  const isNewAdditionalResource = activeAdditionalResource ? isDefaultId(activeAdditionalResource.id) : false;

  const editAdditionalResource = (id: string) => {
    const resource = work.additionalResources.find((r) => r.id === id);

    if (!resource) return;

    edit({ ...resource });
  };

  const addAdditionalResource = () => {
    edit({ ...defaultAdditionalResource });
  };

  const dragEnd = async (data: AdditionalResourceEntity[]) => {
    const updatedData = data.map((resource, index) => ({ ...resource, orderNumber: index + 1 }));

    const resourceToUpdate = updatedData.find((resource, index) => work.additionalResources[index].id !== resource.id);

    if (!resourceToUpdate) return;

    await moveAdditionalResource({
      additionalResourceId: resourceToUpdate.id,
      newOrdinal: resourceToUpdate.orderNumber,
    });
  };

  const deleteAdditionalResource = async (id: string) => {
    await deleteAdditionalResourceMutation(id);
  };

  return {
    additionalResources: work.additionalResources,
    activeAdditionalResource,
    isNewAdditionalResource,
    editDisabled: !!activeFormId,
    loading,
    fetching,
    deleteLoading,
    editAdditionalResource,
    addAdditionalResource,
    dragEnd,
    deleteAdditionalResource,
  };
};
