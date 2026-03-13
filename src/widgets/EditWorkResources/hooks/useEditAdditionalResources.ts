'use client';

import {
  useAdditionalResourceStateMachine,
  useDeleteAdditionalResource,
  useMoveAdditionalResource,
  useUpdateAdditionalResource,
} from '@/src/entities/additional-resource';
import type { AdditionalResourceEntity } from '@/src/entities/additional-resource/model/additional-resource.types';
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
  orderNumber: 0,
};

export const useEditAdditionalResources = (
  workId: WorkId,
  additionalResources: AdditionalResourceEntity[],
) => {
  const { activeEntity: activeAdditionalResource, edit } = useAdditionalResourceStateMachine();
  const { activeFormId } = useFormStateMachine();
  const { deleteAdditionalResource: deleteAdditionalResourceMutation, loading: deleteLoading } =
    useDeleteAdditionalResource();
  const { updateAdditionalResource } = useUpdateAdditionalResource({ workId });
  const { moveAdditionalResource } = useMoveAdditionalResource({ workId });

  const isNewAdditionalResource = activeAdditionalResource ? isDefaultId(activeAdditionalResource.id) : false;

  const editAdditionalResource = (id: string) => {
    const resource = additionalResources.find((r) => r.id === id);

    if (!resource) return;

    edit({ ...resource });
  };

  const addAdditionalResource = () => {
    edit({ ...defaultAdditionalResource });
  };

  const dragEnd = async (data: AdditionalResourceEntity[]) => {
    const updatedData = data.map((resource, index) => ({ ...resource, orderNumber: index + 1 }));

    const resourceToUpdate = updatedData.find(
      (resource, index) => additionalResources[index].id !== resource.id,
    );

    if (!resourceToUpdate) return;

    await moveAdditionalResource({
      additionalResourceId: resourceToUpdate.id,
      newOrdinal: resourceToUpdate.orderNumber,
    });
  };

  const deleteAdditionalResource = async (id: string) => {
    await deleteAdditionalResourceMutation(id);

    const resourcesWithUpdatedOrderNumbers = additionalResources
      .filter((resource) => resource.id !== id)
      .map((resource, index) => ({
        ...resource,
        orderNumber: index + 1,
      }));

    const promises = resourcesWithUpdatedOrderNumbers.map((resource) => {
      return updateAdditionalResource({ ...resource, orderNumber: resource.orderNumber });
    });

    await Promise.all(promises);
  };

  return {
    activeAdditionalResource,
    isNewAdditionalResource,
    editDisabled: !!activeFormId,
    deleteLoading,
    editAdditionalResource,
    addAdditionalResource,
    dragEnd,
    deleteAdditionalResource,
  };
};
