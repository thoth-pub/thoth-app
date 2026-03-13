'use client';

import type { AdditionalResourceEntity } from '@/src/entities/additional-resource';
import { AdditionalResourcesList } from '@/src/entities/additional-resource';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { AddButton, TranslatedContent } from '@/src/shared/ui';

import AddAdditionalResource from '../../../features/additional-resource/AddAdditionalResource/AddAdditionalResource';
import EditAdditionalResource from '../../../features/additional-resource/EditAdditionalResource/EditAdditionalResource';
import { useEditAdditionalResources } from '../hooks/useEditAdditionalResources';

type AdditionalResourcesSectionProps = {
  workId: WorkId;
  additionalResources: AdditionalResourceEntity[];
};

export const AdditionalResourcesSection = ({
  workId,
  additionalResources: mockAdditionalResources,
}: AdditionalResourcesSectionProps) => {
  const {
    activeAdditionalResource,
    isNewAdditionalResource,
    editDisabled,
    deleteLoading,
    editAdditionalResource,
    addAdditionalResource,
    dragEnd,
    deleteAdditionalResource,
  } = useEditAdditionalResources(workId, mockAdditionalResources);

  return (
    <>
      <AdditionalResourcesList
        activeAdditionalResource={activeAdditionalResource}
        additionalResources={mockAdditionalResources}
        form={<EditAdditionalResource workId={workId} />}
        editDisabled={editDisabled}
        deleteLoading={deleteLoading}
        onDelete={deleteAdditionalResource}
        onEdit={editAdditionalResource}
        onDragEnd={dragEnd}
      />
      {isNewAdditionalResource && (
        <AddAdditionalResource workId={workId} additionalResources={mockAdditionalResources} />
      )}
      <AddButton className="px-4 capitalize" onAdd={addAdditionalResource} disabled={isNewAdditionalResource}>
        <TranslatedContent content="actions.addNewAdditionalResource" />
      </AddButton>
    </>
  );
};
