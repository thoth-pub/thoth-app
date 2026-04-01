'use client';

import { ReferencesList } from '@/src/entities/reference';
import { BaseEditSectionProps } from '@/src/shared/types';
import { AddButton, ContentSection, TranslatedContent } from '@/src/shared/ui';

import AddReference from '../../reference/AddReference/AddReference';
import EditReference from '../../reference/EditReference/EditReference';
import { useEditReferences } from './useEditReferences';

const EditReferences = (props: BaseEditSectionProps) => {
  const { workId } = props;

  const {
    activeReference,
    references,
    isNewReference,
    editDisabled,
    loading,
    deleteLoading,
    editReference,
    addReference,
    dragEnd,
    deleteReference,
  } = useEditReferences(workId);

  return (
    <ContentSection title={<TranslatedContent content="references" />}>
      <>
        <ReferencesList
          activeReference={activeReference}
          references={references}
          form={<EditReference workId={workId} />}
          editDisabled={editDisabled}
          loading={loading}
          deleteLoading={deleteLoading}
          onDelete={deleteReference}
          onEdit={editReference}
          onDragEnd={dragEnd}
        />
        {isNewReference && <AddReference workId={workId} />}
        <AddButton className="px-4 capitalize" onAdd={addReference} disabled={isNewReference}>
          <TranslatedContent content="actions.addNewReference" />
        </AddButton>
      </>
    </ContentSection>
  );
};

export default EditReferences;
