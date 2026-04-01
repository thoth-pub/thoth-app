'use client';

import { AdditionalResourcesList } from '@/src/entities/additional-resource';
import type { WorkId } from '@/src/entities/work/model/work.types';
import { AddButton, TranslatedContent } from '@/src/shared/ui';

import AddAdditionalResource from '../../../features/additional-resource/AddAdditionalResource/AddAdditionalResource';
import EditAdditionalResource from '../../../features/additional-resource/EditAdditionalResource/EditAdditionalResource';
import { useEditAdditionalResources } from '../hooks/useEditAdditionalResources';

type AdditionalResourcesSectionProps = {
  workId: WorkId;
};

export const AdditionalResourcesSection = ({ workId }: AdditionalResourcesSectionProps) => {
  const {
    additionalResources,
    activeAdditionalResource,
    isNewAdditionalResource,
    editDisabled,
    loading,
    fetching,
    deleteLoading,
    editAdditionalResource,
    addAdditionalResource,
    dragEnd,
    deleteAdditionalResource,
  } = useEditAdditionalResources(workId);

  return (
    <>
      <AdditionalResourcesList
        activeAdditionalResource={activeAdditionalResource}
        additionalResources={additionalResources}
        form={<EditAdditionalResource workId={workId} />}
        editDisabled={editDisabled}
        loading={loading || fetching}
        deleteLoading={deleteLoading}
        onDelete={deleteAdditionalResource}
        onEdit={editAdditionalResource}
        onDragEnd={dragEnd}
      />
      {isNewAdditionalResource && <AddAdditionalResource workId={workId} additionalResources={additionalResources} />}
      <AddButton className="px-4 capitalize" onAdd={addAdditionalResource} disabled={isNewAdditionalResource}>
        <TranslatedContent content="actions.addNewAdditionalResource" />
      </AddButton>
    </>
  );
};
