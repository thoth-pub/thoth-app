'use client';

import { useState } from 'react';

import {
  EditAdditionalResourceForm,
  useAdditionalResourceStateMachine,
  useCreateAdditionalResource,
} from '@/src/entities/additional-resource';
import type { AdditionalResourceEntity } from '@/src/entities/additional-resource/model/additional-resource.types';
import type { BaseRecommendedSectionProps } from '@/src/shared/types';
import { TableNewEntityFormWrapper } from '@/src/shared/ui';

type AddAdditionalResourceProps = BaseRecommendedSectionProps & {
  additionalResources?: AdditionalResourceEntity[];
};

const emptyAdditionalResources: AdditionalResourceEntity[] = [];

const AddAdditionalResource = (props: AddAdditionalResourceProps) => {
  const { workId, additionalResources = emptyAdditionalResources } = props;

  const { activeEntity: activeAdditionalResource, finishEditing } = useAdditionalResourceStateMachine();
  const [additionalResource, setAdditionalResource] = useState<AdditionalResourceEntity | null>(
    activeAdditionalResource,
  );
  const { createAdditionalResource } = useCreateAdditionalResource({ workId });

  const create = () => {
    if (!additionalResource) return;

    const lastOrderNumber = [...additionalResources].sort((a, b) => b.orderNumber - a.orderNumber)[0]?.orderNumber;

    createAdditionalResource({
      ...additionalResource,
      orderNumber: lastOrderNumber ? lastOrderNumber + 1 : 1,
    });
    finishEditing();
  };

  const updateTitle = (title: string) => {
    if (!additionalResource) return;

    setAdditionalResource({ ...additionalResource, title });
  };

  const updateDescription = (description: string) => {
    if (!additionalResource) return;

    setAdditionalResource({ ...additionalResource, description });
  };

  const updateAttribution = (attribution: string) => {
    if (!additionalResource) return;

    setAdditionalResource({ ...additionalResource, attribution });
  };

  const updateResourceType = (resourceType: string) => {
    if (!additionalResource) return;

    setAdditionalResource({ ...additionalResource, resourceType });
  };

  const updateDoi = (doi: string) => {
    if (!additionalResource) return;

    setAdditionalResource({ ...additionalResource, doi });
  };

  const updateHandle = (handle: string) => {
    if (!additionalResource) return;

    setAdditionalResource({ ...additionalResource, handle });
  };

  const updateUrl = (url: string) => {
    if (!additionalResource) return;

    setAdditionalResource({ ...additionalResource, url });
  };

  if (!additionalResource) return null;

  const { title, description, attribution, resourceType, doi, handle, url } = additionalResource;

  return (
    <TableNewEntityFormWrapper>
      <EditAdditionalResourceForm
        title={title}
        description={description}
        attribution={attribution}
        resourceType={resourceType}
        doi={doi}
        handle={handle}
        url={url}
        isDoneDisabled={!title?.trim() || !resourceType?.trim()}
        onTitleUpdate={updateTitle}
        onDescriptionUpdate={updateDescription}
        onAttributionUpdate={updateAttribution}
        onResourceTypeUpdate={updateResourceType}
        onDoiUpdate={updateDoi}
        onHandleUpdate={updateHandle}
        onUrlUpdate={updateUrl}
        onDone={create}
        onClose={finishEditing}
      />
    </TableNewEntityFormWrapper>
  );
};

export default AddAdditionalResource;
